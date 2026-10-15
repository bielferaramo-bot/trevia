import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, optionalAuthenticate } from '../auth.js';

export const escrowRouter = express.Router();

// Helper to generate a realistic PIX Copia e Cola code
function generatePixPayload(amount, depositId) {
  const formattedAmount = Number(amount).toFixed(2);
  const cleanId = depositId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  // Trevia Chave PIX oficial CNPJ/E-mail simulada
  return `00020126580014br.gov.bcb.pix0136pix@trevia.work520400005303986540${formattedAmount.length < 10 ? '0' + formattedAmount.length : formattedAmount}${formattedAmount}5802BR5916TREVIA SERVICOS6009JOINVILLE62240520TREVIA${cleanId}6304ABCD`;
}

// Get escrow deposit for an order
escrowRouter.get('/order/:orderId', optionalAuthenticate, (req, res) => {
  try {
    const { orderId } = req.params;
    const deposit = db.prepare(`
      SELECT e.*, 
             c.name as client_name, 
             p.name as provider_name,
             o.title as order_title
      FROM escrow_deposits e
      JOIN users c ON e.client_id = c.id
      LEFT JOIN users p ON e.provider_id = p.id
      JOIN orders o ON e.order_id = o.id
      WHERE e.order_id = ?
      ORDER BY e.created_at DESC
      LIMIT 1
    `).get(orderId);

    if (!deposit) {
      return res.json({ deposit: null });
    }

    const currentUserId = req.user?.id;
    const isClient = currentUserId === deposit.client_id;
    const isProvider = currentUserId === deposit.provider_id;
    const isAdmin = req.user?.role === 'admin';

    res.json({
      deposit,
      permissions: {
        is_client: isClient,
        is_provider: isProvider,
        can_fund: isClient && deposit.status === 'pendente',
        can_release: (isClient || isAdmin) && deposit.status === 'em_custodia',
        can_dispute: (isClient || isProvider || isAdmin) && deposit.status === 'em_custodia'
      }
    });
  } catch (err) {
    console.error('Erro ao consultar custódia PIX:', err);
    res.status(500).json({ error: 'Erro ao consultar pagamento protegido.' });
  }
});

// Create/propose escrow deposit
escrowRouter.post('/order/:orderId', authenticate, (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, description = 'Sinal de garantia para início do serviço', provider_id = null } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 5) {
      return res.status(400).json({ error: 'O valor do sinal seguro deve ser de no mínimo R$ 5,00.' });
    }

    const order = db.prepare('SELECT id, client_id, title FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // Existing active deposit
    const existing = db.prepare(`
      SELECT id, status FROM escrow_deposits 
      WHERE order_id = ? AND status IN ('pendente', 'em_custodia')
    `).get(orderId);

    if (existing) {
      return res.status(400).json({ error: 'Já existe um sinal seguro ativo ou pendente para este pedido.' });
    }

    const id = 'esc-' + uuidv4();
    const now = new Date().toISOString();
    const pixCode = generatePixPayload(parsedAmount, id);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(pixCode)}`;

    db.prepare(`
      INSERT INTO escrow_deposits (
        id, order_id, client_id, provider_id, amount, description, status, pix_code, qr_code_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)
    `).run(
      id,
      orderId,
      order.client_id,
      provider_id,
      parsedAmount,
      description.trim(),
      pixCode,
      qrCodeUrl,
      now
    );

    const deposit = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(id);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'escrow_created', 'escrow', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, id, `Sinal de R$ ${parsedAmount.toFixed(2)} criado para o pedido ${order.title}`);
    } catch (e) {}

    res.status(201).json({
      deposit,
      message: 'Sinal seguro gerado com sucesso! Efetue o PIX para ativar a custódia garantida.'
    });
  } catch (err) {
    console.error('Erro ao gerar sinal seguro:', err);
    res.status(500).json({ error: 'Erro ao gerar sinal seguro.' });
  }
});

// Pay / Fund escrow deposit (Simulate or confirm instant PIX receipt)
escrowRouter.post('/:depositId/fund', authenticate, (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);

    if (!deposit) {
      return res.status(404).json({ error: 'Depósito em custódia não encontrado.' });
    }

    if (deposit.status !== 'pendente') {
      return res.status(400).json({ error: `Este sinal já está no status "${deposit.status}".` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE escrow_deposits 
      SET status = 'em_custodia', funded_at = ? 
      WHERE id = ?
    `).run(now, depositId);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'escrow_funded', 'escrow', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, depositId, `Sinal de R$ ${deposit.amount.toFixed(2)} recebido em custódia Trevia.`);
    } catch (e) {}

    const updated = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);
    res.json({
      deposit: updated,
      message: '🛡️ Pagamento confirmado! O valor está seguro na custódia Trevia e só será liberado após a conclusão do serviço.'
    });
  } catch (err) {
    console.error('Erro ao confirmar custódia:', err);
    res.status(500).json({ error: 'Erro ao confirmar pagamento do sinal.' });
  }
});

// Release escrow deposit to provider
escrowRouter.post('/:depositId/release', authenticate, (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);

    if (!deposit) {
      return res.status(404).json({ error: 'Depósito em custódia não encontrado.' });
    }

    const isClient = req.user.id === deposit.client_id;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isAdmin) {
      return res.status(403).json({ error: 'Apenas o contratante do serviço pode autorizar a liberação do sinal.' });
    }

    if (deposit.status !== 'em_custodia') {
      return res.status(400).json({ error: 'O valor não está em custódia ativa para liberação.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE escrow_deposits 
      SET status = 'liberado', released_at = ? 
      WHERE id = ?
    `).run(now, depositId);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'escrow_released', 'escrow', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, depositId, `Sinal de R$ ${deposit.amount.toFixed(2)} liberado ao prestador.`);
    } catch (e) {}

    const updated = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);
    res.json({
      deposit: updated,
      message: '✅ Sinal liberado com sucesso ao profissional! Obrigado por contratar com segurança pela Trevia.'
    });
  } catch (err) {
    console.error('Erro ao liberar sinal seguro:', err);
    res.status(500).json({ error: 'Erro ao liberar valor do sinal.' });
  }
});

// Dispute escrow deposit
escrowRouter.post('/:depositId/dispute', authenticate, (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason = 'Serviço não realizado ou desacordo comercial' } = req.body;

    const deposit = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Depósito não encontrado.' });
    }

    if (deposit.status !== 'em_custodia') {
      return res.status(400).json({ error: 'Apenas depósitos em custódia ativa podem entrar em mediação.' });
    }

    db.prepare(`
      UPDATE escrow_deposits 
      SET status = 'em_disputa', description = COALESCE(description || ' | ', '') || ' [Disputa: ' || ? || ']'
      WHERE id = ?
    `).run(reason, depositId);

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'escrow_dispute_opened', 'escrow', ?, ?)
      `).run('log-' + uuidv4(), req.user.id, depositId, `Mediação solicitada: ${reason}`);
    } catch (e) {}

    const updated = db.prepare('SELECT * FROM escrow_deposits WHERE id = ?').get(depositId);
    res.json({
      deposit: updated,
      message: '⚠️ Mediação Trevia aberta com sucesso. O valor continuará bloqueado em segurança até a resolução do suporte.'
    });
  } catch (err) {
    console.error('Erro ao abrir mediação:', err);
    res.status(500).json({ error: 'Erro ao abrir mediação do sinal.' });
  }
});
