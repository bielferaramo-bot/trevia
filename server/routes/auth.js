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
      INSERT INTO users (id, name, email, password_hash, role, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
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
      status: 'active'
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
      status: userRecord.status
    };

    const token = generateToken(user);
    res.json({ token, user, message: 'Login realizado com sucesso!' });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
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
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});

// Update personal data
authRouter.put('/me', authenticate, (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome não pode ser vazio.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?
    `).run(name.trim(), phone ? phone.trim() : '', now, req.user.id);

    const updatedUser = db.prepare('SELECT id, name, email, role, phone, status FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updatedUser, message: 'Dados atualizados com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
});
