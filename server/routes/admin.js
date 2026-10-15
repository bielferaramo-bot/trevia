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

// Credit Recharges PIX Moderation & Approvals
adminRouter.get('/recharges', (req, res) => {
  try {
    const recharges = db.prepare(`
      SELECT 
        r.*, 
        u.name as user_name, 
        u.name as buyer_name, 
        u.email as user_email, 
        u.email as buyer_email, 
        u.phone as user_phone, 
        u.phone as buyer_phone,
        u.credits as buyer_current_credits
      FROM credit_recharges r
      JOIN users u ON r.user_id = u.id
      ORDER BY 
        CASE r.status 
          WHEN 'em_analise' THEN 1 
          WHEN 'pendente' THEN 2 
          WHEN 'aprovado' THEN 3 
          ELSE 4 
        END,
        r.created_at DESC
    `).all();

    res.json({ recharges });
  } catch (err) {
    console.error('Erro ao listar recargas admin:', err);
    res.status(500).json({ error: 'Erro ao listar recargas.' });
  }
});

adminRouter.post('/recharges/:id/approve', (req, res) => {
  try {
    const recharge = db.prepare('SELECT * FROM credit_recharges WHERE id = ?').get(req.params.id);
    if (!recharge) {
      return res.status(404).json({ error: 'Recarga não encontrada.' });
    }

    if (recharge.status === 'aprovado') {
      return res.status(400).json({ error: 'Esta recarga já foi aprovada anteriormente.' });
    }

    const now = new Date().toISOString();

    // Release credits to user
    db.prepare('UPDATE users SET credits = credits + ?, updated_at = ? WHERE id = ?').run(
      recharge.credits,
      now,
      recharge.user_id
    );

    // Update recharge status
    db.prepare(`
      UPDATE credit_recharges 
      SET status = 'aprovado', reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).run(now, req.user.id, req.params.id);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'recharge_approved', 'credit_recharge', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, recharge.id, `Aprovou recarga de ${recharge.credits} créditos (R$ ${recharge.amount.toFixed(2)}) para usuário ${recharge.user_id}`);
    } catch (e) {}

    const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(recharge.user_id);

    res.json({
      success: true,
      message: `Recarga aprovada com sucesso! ${recharge.credits} créditos foram liberados para o usuário.`,
      credits_added: recharge.credits,
      new_balance: updatedUser.credits,
      user_credits: updatedUser.credits
    });
  } catch (err) {
    console.error('Erro ao aprovar recarga:', err);
    res.status(500).json({ error: 'Erro ao aprovar recarga.' });
  }
});

adminRouter.post('/recharges/:id/reject', (req, res) => {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE credit_recharges 
      SET status = 'rejeitado', reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).run(now, req.user.id, req.params.id);

    res.json({ success: true, message: 'Recarga marcada como rejeitada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar recarga.' });
  }
});
