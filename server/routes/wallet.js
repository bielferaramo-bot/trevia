import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

export const walletRouter = express.Router();

export const TREVIA_OFFICIAL_PIX_KEY = 'c8b36d11-7899-4ce7-999a-7ac85399dd71';

// Helper to generate a realistic BR Code PIX Copia e Cola with official key
function generateWalletPixPayload(amount, depositId) {
  const formattedAmount = Number(amount).toFixed(2);
  const cleanId = depositId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  return `00020126580014br.gov.bcb.pix0136${TREVIA_OFFICIAL_PIX_KEY}520400005303986540${formattedAmount.length < 10 ? '0' + formattedAmount.length : formattedAmount}${formattedAmount}5802BR5916TREVIA SERVICOS6009JOINVILLE62240520TREVIA${cleanId}6304E8F2`;
}

// 1. Get Wallet Summary (Available balance, held escrow, recent transactions, pending withdrawals)
walletRouter.get('/summary', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // Fresh user balance
    const userRow = db.prepare('SELECT COALESCE(wallet_balance, 0.0) as wallet_balance FROM users WHERE id = ?').get(userId);
    const walletBalance = userRow?.wallet_balance ?? 0.0;

    // Escrow held balance (waiting for completion as client or provider)
    const clientHeld = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_deposits WHERE client_id = ? AND status = 'em_custodia'").get(userId)?.total || 0;
    const providerHeld = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_deposits WHERE provider_id = ? AND status = 'em_custodia'").get(userId)?.total || 0;
    const heldBalance = clientHeld + providerHeld;

    // Pending and total withdrawals
    const pendingWithdrawals = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_withdrawals WHERE user_id = ? AND status = 'pendente'").get(userId)?.total || 0;
    const totalWithdrawn = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_withdrawals WHERE user_id = ? AND status = 'pago'").get(userId)?.total || 0;
    const totalDeposited = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_deposits WHERE user_id = ? AND status = 'aprovado'").get(userId)?.total || 0;

    // Recent transactions
    const recentTransactions = db.prepare(`
      SELECT * FROM wallet_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 25
    `).all(userId);

    // Active escrow deposits involving this user
    const activeEscrows = db.prepare(`
      SELECT e.*, o.title as order_title
      FROM escrow_deposits e
      JOIN orders o ON e.order_id = o.id
      WHERE (e.client_id = ? OR e.provider_id = ?)
        AND e.status IN ('pendente', 'em_custodia', 'em_disputa')
      ORDER BY e.created_at DESC
      LIMIT 10
    `).all(userId, userId);

    res.json({
      wallet_balance: walletBalance,
      held_balance: heldBalance,
      pending_withdrawals: pendingWithdrawals,
      total_withdrawn: totalWithdrawn,
      total_deposited: totalDeposited,
      official_pix_key: TREVIA_OFFICIAL_PIX_KEY,
      recent_transactions: recentTransactions,
      active_escrows: activeEscrows
    });
  } catch (err) {
    console.error('Erro ao consultar resumo da carteira:', err);
    res.status(500).json({ error: 'Erro ao carregar carteira digital.' });
  }
});

// 2. List Transactions (Paginated / Filtered)
walletRouter.get('/transactions', authenticate, (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM wallet_transactions WHERE user_id = ?';
    const params = [userId];

    if (type && type !== 'todos') {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(sql).all(...params);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar extrato de transações.' });
  }
});

// 3. Create Deposit Request via PIX
walletRouter.post('/deposit', authenticate, (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 5) {
      return res.status(400).json({ error: 'O valor mínimo para depósito via PIX é de R$ 5,00.' });
    }

    if (numAmount > 50000) {
      return res.status(400).json({ error: 'Valor excede o limite máximo por transação (R$ 50.000,00).' });
    }

    const depositId = 'wdep-' + uuidv4();
    const now = new Date().toISOString();
    const pixCode = generateWalletPixPayload(numAmount, depositId);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(pixCode)}`;

    db.prepare(`
      INSERT INTO wallet_deposits (
        id, user_id, amount, pix_key, pix_code, qr_code_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)
    `).run(
      depositId,
      req.user.id,
      numAmount,
      TREVIA_OFFICIAL_PIX_KEY,
      pixCode,
      qrCodeUrl,
      now
    );

    const deposit = db.prepare('SELECT * FROM wallet_deposits WHERE id = ?').get(depositId);

    res.status(201).json({
      deposit,
      official_pix_key: TREVIA_OFFICIAL_PIX_KEY,
      message: 'Cobrança PIX gerada com sucesso! Efetue o pagamento para adicionar saldo à sua Carteira Trevia.'
    });
  } catch (err) {
    console.error('Erro ao gerar depósito PIX:', err);
    res.status(500).json({ error: 'Erro interno ao gerar depósito via PIX.' });
  }
});

// 4. Confirm / Credit Deposit (Instant simulation or confirmation of PIX)
walletRouter.post('/deposit/:id/confirm', authenticate, (req, res) => {
  try {
    const deposit = db.prepare('SELECT * FROM wallet_deposits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Depósito não encontrado.' });
    }

    if (deposit.status === 'aprovado') {
      return res.status(400).json({ error: 'Este depósito já foi creditado anteriormente.' });
    }

    const now = new Date().toISOString();

    // 1. Credit user's wallet
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = ? WHERE id = ?').run(
      deposit.amount,
      now,
      req.user.id
    );

    // 2. Fetch new balance
    const updatedUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id);
    const newBalance = updatedUser.wallet_balance;

    // 3. Mark deposit approved
    db.prepare(`
      UPDATE wallet_deposits 
      SET status = 'aprovado', confirmed_at = ?, confirmed_by = ? 
      WHERE id = ?
    `).run(now, req.user.id, deposit.id);

    // 4. Record wallet transaction
    db.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, type, amount, direction, balance_after, status, description, reference_id, created_at
      ) VALUES (?, ?, 'deposito', ?, 'credit', ?, 'concluido', ?, ?, ?)
    `).run(
      'wtx-' + uuidv4(),
      req.user.id,
      deposit.amount,
      newBalance,
      `Depósito via PIX na Carteira Trevia (Chave: ${TREVIA_OFFICIAL_PIX_KEY.slice(0, 8)}...)`,
      deposit.id,
      now
    );

    res.json({
      success: true,
      new_balance: newBalance,
      deposit_amount: deposit.amount,
      message: `✅ Depósito de R$ ${deposit.amount.toFixed(2)} confirmado com sucesso! Saldo adicionado à sua carteira.`
    });
  } catch (err) {
    console.error('Erro ao confirmar depósito:', err);
    res.status(500).json({ error: 'Erro ao processar confirmação de depósito.' });
  }
});

// 5. Request PIX Withdrawal from Wallet
walletRouter.post('/withdraw', authenticate, (req, res) => {
  try {
    const { amount, pix_key_type = 'cpf', pix_key } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 5) {
      return res.status(400).json({ error: 'O valor mínimo para saque via PIX é de R$ 5,00.' });
    }

    if (!pix_key || !pix_key.trim()) {
      return res.status(400).json({ error: 'Informe sua chave PIX de destino para receber a transferência.' });
    }

    const cleanPixKey = pix_key.trim();
    const validKeyTypes = ['cpf', 'cnpj', 'email', 'phone', 'random'];
    const keyType = validKeyTypes.includes(pix_key_type) ? pix_key_type : 'cpf';

    // Verify user balance
    const user = db.prepare('SELECT id, wallet_balance, name FROM users WHERE id = ?').get(req.user.id);
    const currentBalance = user?.wallet_balance ?? 0.0;

    if (currentBalance < numAmount) {
      return res.status(400).json({
        error: `Saldo insuficiente na carteira. Seu saldo disponível é de R$ ${currentBalance.toFixed(2)}.`
      });
    }

    const now = new Date().toISOString();
    const withdrawalId = 'wwith-' + uuidv4();

    // 1. Atomically deduct from user's wallet
    const updateRes = db.prepare(`
      UPDATE users 
      SET wallet_balance = wallet_balance - ?, updated_at = ? 
      WHERE id = ? AND wallet_balance >= ?
    `).run(numAmount, now, req.user.id, numAmount);

    if (updateRes.changes === 0) {
      return res.status(400).json({ error: 'Saldo insuficiente ou movimentação concorrente detectada.' });
    }

    const updatedUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id);
    const newBalance = updatedUser.wallet_balance;

    // 2. Insert into wallet_withdrawals
    db.prepare(`
      INSERT INTO wallet_withdrawals (
        id, user_id, amount, pix_key_type, pix_key, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pendente', ?)
    `).run(
      withdrawalId,
      req.user.id,
      numAmount,
      keyType,
      cleanPixKey,
      now
    );

    // 3. Record transaction in statement
    db.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, type, amount, direction, balance_after, status, description, reference_id, created_at
      ) VALUES (?, ?, 'saque', ?, 'debit', ?, 'pendente', ?, ?, ?)
    `).run(
      'wtx-' + uuidv4(),
      req.user.id,
      numAmount,
      newBalance,
      `Solicitação de Saque PIX (${keyType.toUpperCase()}: ${cleanPixKey})`,
      withdrawalId,
      now
    );

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'wallet_withdrawal_requested', 'wallet_withdrawal', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, withdrawalId, `Solicitou saque de R$ ${numAmount.toFixed(2)} para PIX ${cleanPixKey}`);
    } catch (e) {}

    const withdrawal = db.prepare('SELECT * FROM wallet_withdrawals WHERE id = ?').get(withdrawalId);

    res.status(201).json({
      withdrawal,
      new_balance: newBalance,
      message: `💸 Solicitação de saque de R$ ${numAmount.toFixed(2)} realizada com sucesso! O valor será transferido para sua chave PIX (${cleanPixKey}).`
    });
  } catch (err) {
    console.error('Erro ao solicitar saque:', err);
    res.status(500).json({ error: 'Erro interno ao solicitar saque da carteira.' });
  }
});

// 6. List user's withdrawal requests
walletRouter.get('/withdrawals', authenticate, (req, res) => {
  try {
    const withdrawals = db.prepare(`
      SELECT * FROM wallet_withdrawals 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar solicitações de saque.' });
  }
});
