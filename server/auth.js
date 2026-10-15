import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'trevia_secure_secret_key_joinville_2026';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }

    // Verify user still exists and is not suspended
    const user = db.prepare('SELECT id, name, email, role, phone, status, avatar_url, credits, base_neighborhood, COALESCE(has_received_welcome_bonus, 0) as has_received_welcome_bonus FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Esta conta está suspensa pela moderação.' });
    }

    req.user = user;
    next();
  });
}

// Optional authentication - populates req.user if valid token provided, but doesn't block if not
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      const user = db.prepare('SELECT id, name, email, role, phone, status, avatar_url, credits, base_neighborhood, COALESCE(has_received_welcome_bonus, 0) as has_received_welcome_bonus FROM users WHERE id = ?').get(decoded.id);
      if (user && user.status !== 'suspended') {
        req.user = user;
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito à administração.' });
  }
  next();
}
