import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { generateToken, authenticate } from '../auth.js';

export const authRouter = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Register
authRouter.post('/register', (req, res) => {
  try {
    const { name, email, password, role = 'client', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
    }

    const userId = 'usr-' + uuidv4();
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, 10);
    const validRole = ['client', 'provider', 'both'].includes(role) ? role : 'client';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, status, avatar_url, credits, base_neighborhood, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', '', 3, 'Centro', ?, ?)
    `).run(userId, name.trim(), trimmedEmail, hash, validRole, phone.trim(), now, now);

    // If registered as provider or both, create an initial professional profile
    if (validRole === 'provider' || validRole === 'both') {
      const baseSlug = slugify(name);
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const profileId = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        profileId,
        userId,
        name.trim(),
        slug,
        'Profissional autônomo disponível para contratação em Joinville e região.',
        JSON.stringify([]),
        JSON.stringify(['Joinville']),
        phone.trim(),
        phone.trim(),
        JSON.stringify([]),
        now,
        now
      );
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      role: validRole,
      phone: phone.trim(),
      status: 'active',
      avatar_url: '',
      credits: 3,
      wallet_balance: 0.0,
      base_neighborhood: 'Centro',
      has_received_welcome_bonus: 0
    };

    const token = generateToken(user);
    res.status(201).json({ token, user, message: 'Conta criada com sucesso!' });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// Login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRecord = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);

    if (!userRecord) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (userRecord.status === 'suspended') {
      return res.status(403).json({ error: 'Esta conta foi suspensa pela moderação.' });
    }

    const match = bcrypt.compareSync(password, userRecord.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      phone: userRecord.phone,
      status: userRecord.status,
      avatar_url: userRecord.avatar_url || '',
      credits: userRecord.credits ?? 3,
      wallet_balance: userRecord.wallet_balance ?? 0.0,
      base_neighborhood: userRecord.base_neighborhood || 'Centro',
      has_received_welcome_bonus: userRecord.has_received_welcome_bonus ?? 0
    };

    const token = generateToken(user);
    res.json({ token, user, message: 'Login realizado com sucesso!' });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// Google Authentication
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role = 'client' } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Credencial do Google não fornecida.' });
    }

    let googleData = null;

    // Verify token with Google's public tokeninfo endpoint
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (response.ok) {
        googleData = await response.json();
      }
    } catch (e) {
      console.warn('Falha ao validar com tokeninfo do Google:', e.message);
    }

    if (!googleData || !googleData.email) {
      return res.status(400).json({ error: 'Token do Google inválido ou expirado.' });
    }

    const email = googleData.email.toLowerCase().trim();
    const name = googleData.name || email.split('@')[0];
    const picture = googleData.picture || '';

    // Check if user exists
    let existingUser = db.prepare('SELECT id, name, email, role, phone, status, avatar_url, credits, base_neighborhood, COALESCE(has_received_welcome_bonus, 0) as has_received_welcome_bonus, COALESCE(wallet_balance, 0.0) as wallet_balance FROM users WHERE email = ?').get(email);

    if (existingUser) {
      if (!existingUser.avatar_url && picture) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(picture, existingUser.id);
        existingUser.avatar_url = picture;
      }
      const token = generateToken(existingUser);
      return res.json({
        token,
        user: {
          ...existingUser,
          avatar_url: existingUser.avatar_url || picture,
          credits: existingUser.credits ?? 3,
          wallet_balance: existingUser.wallet_balance ?? 0.0,
          has_received_welcome_bonus: existingUser.has_received_welcome_bonus ?? 0
        },
        message: 'Login com Google realizado com sucesso!'
      });
    }

    // Register new user via Google
    const userId = 'usr-' + uuidv4();
    const now = new Date().toISOString();
    const validRole = ['client', 'provider', 'both'].includes(role) ? role : 'client';
    const randomHash = bcrypt.hashSync(uuidv4(), 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, status, avatar_url, credits, wallet_balance, base_neighborhood, has_received_welcome_bonus, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', 'active', ?, 3, 0.0, 'Centro', 0, ?, ?)
    `).run(userId, name, email, randomHash, validRole, picture, now, now);

    if (validRole === 'provider' || validRole === 'both') {
      const baseSlug = slugify(name);
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const profileId = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, avatar_url, experience_years,
          payment_methods_json, is_verified, base_neighborhood, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, 2, ?, 1, 'Centro', 'active', ?, ?)
      `).run(
        profileId,
        userId,
        name,
        slug,
        'Profissional autônomo disponível em Joinville e região.',
        JSON.stringify([]),
        JSON.stringify(['Joinville']),
        JSON.stringify([]),
        picture,
        JSON.stringify(['pix', 'dinheiro', 'cartao']),
        now,
        now
      );
    }

    const newUser = {
      id: userId,
      name,
      email,
      role: validRole,
      phone: '',
      status: 'active',
      avatar_url: picture,
      credits: 3,
      wallet_balance: 0.0,
      base_neighborhood: 'Centro',
      has_received_welcome_bonus: 0
    };

    const token = generateToken(newUser);
    return res.status(201).json({
      token,
      user: newUser,
      message: 'Conta criada via Google com sucesso!'
    });
  } catch (err) {
    console.error('Erro na autenticação com Google:', err);
    res.status(500).json({ error: 'Erro ao autenticar com o Google.' });
  }
});

// Current User + Profile
authRouter.get('/me', authenticate, (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    res.json({
      user: req.user,
      profile: profile ? {
        ...profile,
        categories: JSON.parse(profile.categories_json || '[]'),
        locations: JSON.parse(profile.locations_json || '[]'),
        portfolio: JSON.parse(profile.portfolio_json || '[]'),
        payment_methods: JSON.parse(profile.payment_methods_json || '["pix","dinheiro","cartao"]')
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});

// Update personal data
authRouter.put('/me', authenticate, (req, res) => {
  try {
    const { name, phone, avatar_url, base_neighborhood } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome não pode ser vazio.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users 
      SET name = ?, 
          phone = ?, 
          avatar_url = COALESCE(?, avatar_url),
          base_neighborhood = COALESCE(?, base_neighborhood),
          updated_at = ? 
      WHERE id = ?
    `).run(
      name.trim(), 
      phone ? phone.trim() : '', 
      avatar_url !== undefined ? avatar_url : null,
      base_neighborhood !== undefined ? base_neighborhood : null,
      now, 
      req.user.id
    );

    // Also update provider profile if it exists
    if (avatar_url !== undefined || base_neighborhood !== undefined) {
      db.prepare(`
        UPDATE profiles 
        SET avatar_url = COALESCE(?, avatar_url),
            base_neighborhood = COALESCE(?, base_neighborhood),
            updated_at = ?
        WHERE user_id = ?
      `).run(
        avatar_url !== undefined ? avatar_url : null,
        base_neighborhood !== undefined ? base_neighborhood : null,
        now,
        req.user.id
      );
    }

    const updatedUser = db.prepare('SELECT id, name, email, role, phone, status, avatar_url, credits, base_neighborhood, COALESCE(has_received_welcome_bonus, 0) as has_received_welcome_bonus FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updatedUser, message: 'Dados atualizados com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
});
