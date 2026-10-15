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

// Admin Wallet Withdrawals Management
adminRouter.get('/wallet/withdrawals', (req, res) => {
  try {
    const withdrawals = db.prepare(`
      SELECT w.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM wallet_withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `).all();
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar saques.' });
  }
});

adminRouter.post('/wallet/withdrawals/:id/approve', (req, res) => {
  try {
    const withdrawal = db.prepare('SELECT * FROM wallet_withdrawals WHERE id = ?').get(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Solicitação de saque não encontrada.' });
    }

    if (withdrawal.status === 'pago') {
      return res.status(400).json({ error: 'Este saque já foi marcado como pago anteriormente.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE wallet_withdrawals 
      SET status = 'pago', processed_at = ?, processed_by = ? 
      WHERE id = ?
    `).run(now, req.user.id, withdrawal.id);

    // Update corresponding transaction in statement
    db.prepare(`
      UPDATE wallet_transactions 
      SET status = 'concluido' 
      WHERE reference_id = ?
    `).run(withdrawal.id);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'withdrawal_approved', 'wallet_withdrawal', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, withdrawal.id, `Transferência PIX de R$ ${withdrawal.amount.toFixed(2)} confirmada para ${withdrawal.pix_key}`);
    } catch (e) {}

    const updatedWithdrawal = db.prepare('SELECT * FROM wallet_withdrawals WHERE id = ?').get(withdrawal.id);

    res.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: `✅ Saque de R$ ${withdrawal.amount.toFixed(2)} marcado como transferido e concluído via PIX com sucesso!`
    });
  } catch (err) {
    console.error('Erro ao aprovar saque:', err);
    res.status(500).json({ error: 'Erro ao aprovar saque.' });
  }
});

adminRouter.post('/wallet/withdrawals/:id/reject', (req, res) => {
  try {
    const { reason = 'Chave PIX inválida ou inconsistência de titularidade' } = req.body;
    const withdrawal = db.prepare('SELECT * FROM wallet_withdrawals WHERE id = ?').get(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Solicitação de saque não encontrada.' });
    }

    if (withdrawal.status !== 'pendente') {
      return res.status(400).json({ error: `Este saque já está com status "${withdrawal.status}".` });
    }

    const now = new Date().toISOString();

    // 1. Mark withdrawal rejected
    db.prepare(`
      UPDATE wallet_withdrawals 
      SET status = 'rejeitado', rejection_reason = ?, processed_at = ?, processed_by = ? 
      WHERE id = ?
    `).run(reason, now, req.user.id, withdrawal.id);

    // 2. Refund balance back to user's wallet
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = ? WHERE id = ?').run(
      withdrawal.amount,
      now,
      withdrawal.user_id
    );

    const updatedUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(withdrawal.user_id);
    const newBalance = updatedUser?.wallet_balance ?? 0.0;

    // 3. Record refund transaction in statement
    db.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, type, amount, direction, balance_after, status, description, reference_id, created_at
      ) VALUES (?, ?, 'estorno_saque', ?, 'credit', ?, 'concluido', ?, ?, ?)
    `).run(
      'wtx-' + uuidv4(),
      withdrawal.user_id,
      withdrawal.amount,
      newBalance,
      `Estorno de saque rejeitado pelo financeiro (${reason})`,
      withdrawal.id,
      now
    );

    const updatedWithdrawal = db.prepare('SELECT * FROM wallet_withdrawals WHERE id = ?').get(withdrawal.id);

    res.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: `Saque rejeitado e R$ ${withdrawal.amount.toFixed(2)} devolvidos para a carteira do usuário.`
    });
  } catch (err) {
    console.error('Erro ao rejeitar saque:', err);
    res.status(500).json({ error: 'Erro ao processar rejeição de saque.' });
  }
});

// Admin Wallet Deposits Management
adminRouter.get('/wallet/deposits', (req, res) => {
  try {
    const deposits = db.prepare(`
      SELECT d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM wallet_deposits d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `).all();
    res.json({ deposits });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar depósitos.' });
  }
});

adminRouter.post('/wallet/deposits/:id/approve', (req, res) => {
  try {
    const deposit = db.prepare('SELECT * FROM wallet_deposits WHERE id = ?').get(req.params.id);
    if (!deposit) {
      return res.status(404).json({ error: 'Depósito não encontrado.' });
    }

    if (deposit.status === 'aprovado') {
      return res.status(400).json({ error: 'Este depósito já foi aprovado anteriormente.' });
    }

    const now = new Date().toISOString();

    // Credit user's wallet
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = ? WHERE id = ?').run(
      deposit.amount,
      now,
      deposit.user_id
    );

    const updatedUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(deposit.user_id);
    const newBalance = updatedUser?.wallet_balance ?? deposit.amount;

    db.prepare(`
      UPDATE wallet_deposits 
      SET status = 'aprovado', confirmed_at = ?, confirmed_by = ? 
      WHERE id = ?
    `).run(now, req.user.id, deposit.id);

    db.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, type, amount, direction, balance_after, status, description, reference_id, created_at
      ) VALUES (?, ?, 'deposito', ?, 'credit', ?, 'concluido', ?, ?, ?)
    `).run(
      'wtx-' + uuidv4(),
      deposit.user_id,
      deposit.amount,
      newBalance,
      `Depósito via PIX aprovado pela moderação`,
      deposit.id,
      now
    );

    res.json({
      success: true,
      message: `Depósito de R$ ${deposit.amount.toFixed(2)} aprovado e saldo creditado ao usuário.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar depósito.' });
  }
});
