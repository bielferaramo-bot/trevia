import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';

export const adminRouter = express.Router();

adminRouter.use(authenticate, requireAdmin);

// Real metrics
adminRouter.get('/metrics', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalClients = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'client' OR role = 'both'").get().c;
    const totalProviders = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'provider' OR role = 'both'").get().c;
    const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const openOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'aberto'").get().c;
    const completedOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'concluido'").get().c;
    const totalProposals = db.prepare('SELECT COUNT(*) as c FROM proposals').get().c;
    const pendingReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'pendente'").get().c;

    res.json({
      metrics: {
        totalUsers,
        totalClients,
        totalProviders,
        totalOrders,
        openOrders,
        completedOrders,
        totalProposals,
        pendingReports
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular métricas.' });
  }
});

// Categories Management
adminRouter.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar categorias.' });
  }
});

adminRouter.post('/categories', (req, res) => {
  try {
    const { name, slug, description, icon = 'Tag', display_order = 0 } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Nome e slug são obrigatórios.' });
    }

    const id = 'cat-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO categories (id, name, slug, description, icon, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name.trim(), slug.trim(), description || '', icon, Number(display_order));

    res.status(201).json({ message: 'Categoria criada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

adminRouter.put('/categories/:id', (req, res) => {
  try {
    const { name, description, icon, is_active, display_order } = req.body;
    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order)
      WHERE id = ?
    `).run(name, description, icon, is_active, display_order, req.params.id);

    res.json({ message: 'Categoria atualizada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
});

// Locations Management
adminRouter.get('/locations', (req, res) => {
  try {
    const locations = db.prepare('SELECT * FROM locations ORDER BY city ASC').all();
    const formatted = locations.map(l => ({
      ...l,
      neighborhoods: JSON.parse(l.neighborhoods_json || '[]')
    }));
    res.json({ locations: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar localidades.' });
  }
});

adminRouter.put('/locations/:id', (req, res) => {
  try {
    const { neighborhoods, is_active } = req.body;
    db.prepare(`
      UPDATE locations SET
        neighborhoods_json = COALESCE(?, neighborhoods_json),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      neighborhoods ? JSON.stringify(neighborhoods) : null,
      is_active !== undefined ? Number(is_active) : null,
      req.params.id
    );

    res.json({ message: 'Localidade atualizada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar localidade.' });
  }
});

// Reports Management
adminRouter.get('/reports', (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT
        r.*,
        u.name as reporter_name,
        u.email as reporter_email
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
    `).all();

    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar denúncias.' });
  }
});

adminRouter.patch('/reports/:id', (req, res) => {
  try {
    const { status } = req.body;
    if (!['pendente', 'revisado', 'resolvido', 'ignorado'].includes(status)) {
      return res.status(400).json({ error: 'Status de denúncia inválido.' });
    }

    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Denúncia atualizada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar denúncia.' });
  }
});

// User account status moderation
adminRouter.patch('/users/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);

    res.json({ message: `Status do usuário alterado para "${status}".` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});
