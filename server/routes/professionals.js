import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

export const professionalsRouter = express.Router();

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

// Public profile view
professionalsRouter.get('/:slug', (req, res) => {
  try {
    const profile = db.prepare(`
      SELECT
        p.id,
        p.public_name,
        p.slug,
        p.bio,
        p.categories_json,
        p.locations_json,
        p.contact_phone,
        p.whatsapp,
        p.portfolio_json,
        p.created_at,
        u.name as user_name,
        u.status as user_status
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.slug = ? AND p.status = 'active' AND u.status = 'active'
    `).get(req.params.slug);

    if (!profile) {
      return res.status(404).json({ error: 'Perfil profissional não encontrado ou desativado.' });
    }

    res.json({
      profile: {
        id: profile.id,
        public_name: profile.public_name,
        slug: profile.slug,
        bio: profile.bio,
        categories: JSON.parse(profile.categories_json || '[]'),
        locations: JSON.parse(profile.locations_json || '[]'),
        contact_phone: profile.contact_phone,
        whatsapp: profile.whatsapp,
        portfolio: JSON.parse(profile.portfolio_json || '[]'),
        member_since: profile.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar perfil profissional.' });
  }
});

// Provider's own profile
professionalsRouter.get('/me/profile', authenticate, (req, res) => {
  try {
    let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);

    if (!profile) {
      // Auto-create blank profile if not present
      const now = new Date().toISOString();
      const baseSlug = slugify(req.user.name || 'profissional');
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const id = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        id,
        req.user.id,
        req.user.name,
        slug,
        'Profissional autônomo disponível em Joinville e região.',
        JSON.stringify([]),
        JSON.stringify(['Joinville']),
        req.user.phone || '',
        req.user.phone || '',
        JSON.stringify([]),
        now,
        now
      );

      profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    }

    res.json({
      profile: {
        ...profile,
        categories: JSON.parse(profile.categories_json || '[]'),
        locations: JSON.parse(profile.locations_json || '[]'),
        portfolio: JSON.parse(profile.portfolio_json || '[]'),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil do prestador.' });
  }
});

// Update provider profile
professionalsRouter.put('/me/profile', authenticate, (req, res) => {
  try {
    const {
      public_name,
      bio,
      categories = [],
      locations = [],
      contact_phone,
      whatsapp,
      status = 'active'
    } = req.body;

    if (!public_name || !public_name.trim()) {
      return res.status(400).json({ error: 'O nome profissional é obrigatório.' });
    }

    let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    const now = new Date().toISOString();

    if (!profile) {
      const baseSlug = slugify(public_name);
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const id = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        req.user.id,
        public_name.trim(),
        slug,
        bio ? bio.trim() : '',
        JSON.stringify(categories),
        JSON.stringify(locations),
        contact_phone || '',
        whatsapp || '',
        JSON.stringify([]),
        status,
        now,
        now
      );
    } else {
      db.prepare(`
        UPDATE profiles SET
          public_name = ?,
          bio = ?,
          categories_json = ?,
          locations_json = ?,
          contact_phone = ?,
          whatsapp = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        public_name.trim(),
        bio ? bio.trim() : '',
        JSON.stringify(categories),
        JSON.stringify(locations),
        contact_phone || '',
        whatsapp || '',
        status,
        now,
        profile.id
      );
    }

    const updated = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);

    res.json({
      profile: {
        ...updated,
        categories: JSON.parse(updated.categories_json || '[]'),
        locations: JSON.parse(updated.locations_json || '[]'),
        portfolio: JSON.parse(updated.portfolio_json || '[]')
      },
      message: 'Perfil profissional atualizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao salvar perfil profissional:', err);
    res.status(500).json({ error: 'Erro ao salvar perfil profissional.' });
  }
});
