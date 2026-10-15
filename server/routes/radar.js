import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, optionalAuthenticate } from '../auth.js';
import { radarBroadcaster, calculateDistanceKm } from '../services/radarBroadcaster.js';

export const radarRouter = express.Router();

// SSE Stream for Real-time Radar (Uber-style alerts)
radarRouter.get('/stream', optionalAuthenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  // Send initial ping
  res.write(': connected\n\n');

  radarBroadcaster.addClient(res, req.user?.id);

  // Keep connection alive with heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  res.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Fast Polling endpoint (fallback for SSE or initial sync)
radarRouter.get('/latest', optionalAuthenticate, (req, res) => {
  try {
    const { since, category_id, city = 'Joinville' } = req.query;

    let query = `
      SELECT
        o.id,
        o.title,
        o.description,
        o.category_id,
        o.city,
        o.neighborhood,
        o.timeframe,
        o.estimated_budget,
        o.created_at,
        c.name as category_name,
        c.slug as category_slug
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.status = 'aberto' AND LOWER(o.city) = LOWER(?)
    `;
    const params = [city];

    if (since) {
      query += ` AND o.created_at > ?`;
      params.push(since);
    }

    if (category_id) {
      query += ` AND o.category_id = ?`;
      params.push(category_id);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 10`;

    const orders = db.prepare(query).all(...params);

    const userNeighborhood = req.user?.base_neighborhood || 'Centro';

    // Enrich with calculated distance from provider's base neighborhood
    const enriched = orders.map(ord => ({
      ...ord,
      distance_km: calculateDistanceKm(userNeighborhood, ord.neighborhood)
    }));

    res.json({ orders: enriched });
  } catch (err) {
    console.error('Erro ao buscar pedidos do radar:', err);
    res.status(500).json({ error: 'Erro ao verificar radar.' });
  }
});

// Unlock customer contact with 1 credit
radarRouter.post('/orders/:id/unlock', authenticate, (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    // Check order existence
    const order = db.prepare(`
      SELECT o.*, u.name as client_name, u.phone as client_phone
      FROM orders o
      JOIN users u ON o.client_id = u.id
      WHERE o.id = ?
    `).get(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.client_id === userId) {
      return res.status(400).json({ error: 'Você é o autor deste pedido. Seus contatos já pertencem a você.' });
    }

    if (req.user.role === 'client') {
      return res.status(403).json({ error: 'Apenas profissionais cadastrados podem liberar contatos com créditos.' });
    }

    // Check if already unlocked by this user
    const alreadyUnlocked = db.prepare('SELECT id FROM unlocked_contacts WHERE user_id = ? AND order_id = ?').get(userId, orderId);

    if (alreadyUnlocked) {
      return res.json({
        unlocked: true,
        alreadyUnlocked: true,
        client_name: order.client_name,
        client_phone: order.client_phone,
        client_whatsapp: order.client_phone,
        credits_remaining: req.user.credits ?? 3,
        message: 'Contato já liberado anteriormente.'
      });
    }

    // Check if max unlocks limit reached (Exclusivity & Scarcity trigger)
    const maxUnlocks = order.max_unlocks || 3;
    const totalUnlocked = db.prepare('SELECT COUNT(*) as count FROM unlocked_contacts WHERE order_id = ?').get(orderId)?.count || 0;

    if (totalUnlocked >= maxUnlocks) {
      return res.status(400).json({
        error: `As vagas para atender este pedido foram esgotadas (máximo de ${maxUnlocks} profissionais).`,
        spots_exhausted: true
      });
    }

    // Fetch fresh user credits
    const currentUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
    const credits = currentUser?.credits ?? 0;

    if (credits <= 0) {
      return res.status(402).json({
        error: 'Você não possui créditos para liberar este contato.',
        needs_recharge: true,
        credits_remaining: 0
      });
    }

    // Deduct 1 credit & record unlock
    const unlockId = 'unl-' + uuidv4();
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET credits = credits - 1, updated_at = ? WHERE id = ?').run(now, userId);
    db.prepare('INSERT INTO unlocked_contacts (id, user_id, order_id, created_at) VALUES (?, ?, ?, ?)').run(unlockId, userId, orderId, now);

    const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);

    res.json({
      unlocked: true,
      alreadyUnlocked: false,
      client_name: order.client_name,
      client_phone: order.client_phone,
      client_whatsapp: order.client_phone,
      credits_remaining: updatedUser.credits,
      message: 'Contato liberado com sucesso! 1 crédito utilizado.'
    });
  } catch (err) {
    console.error('Erro ao desbloquear contato:', err);
    res.status(500).json({ error: 'Erro ao processar liberação de contato.' });
  }
});

// Request 100% guarantee credit refund (Zero-Friction Guarantee)
radarRouter.post('/orders/:id/refund', authenticate, (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { reason, details = '' } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Informe o motivo da solicitação de estorno.' });
    }

    // Check if already refunded
    const existingRefund = db.prepare('SELECT id FROM credit_refunds WHERE user_id = ? AND order_id = ?').get(userId, orderId);
    if (existingRefund) {
      return res.status(400).json({ error: 'Você já possui uma solicitação de estorno para este pedido.' });
    }

    // Verify user actually unlocked this contact
    const unlocked = db.prepare('SELECT id FROM unlocked_contacts WHERE user_id = ? AND order_id = ?').get(userId, orderId);
    if (!unlocked) {
      return res.status(403).json({ error: 'Você não possui contato liberado deste pedido para solicitar estorno.' });
    }

    const refundId = 'ref-' + uuidv4();
    const now = new Date().toISOString();

    // Re-credit the user immediately (Zero-Friction Guarantee)
    db.prepare('UPDATE users SET credits = credits + 1, updated_at = ? WHERE id = ?').run(now, userId);

    // Save refund record
    db.prepare(`
      INSERT INTO credit_refunds (id, user_id, order_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'aprovado', ?)
    `).run(refundId, userId, orderId, reason, details, now);

    // Remove from unlocked_contacts so state resets safely
    db.prepare('DELETE FROM unlocked_contacts WHERE id = ?').run(unlocked.id);

    const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);

    console.log(`[Trevia Garantia] Crédito estornado com sucesso para prestador ${userId} no pedido ${orderId} (Motivo: ${reason})`);

    res.json({
      success: true,
      message: 'Garantia Trevia ativada! 1 crédito foi estornado de volta para o seu saldo.',
      credits_remaining: updatedUser.credits
    });
  } catch (err) {
    console.error('Erro ao processar estorno de crédito:', err);
    res.status(500).json({ error: 'Erro interno ao processar estorno.' });
  }
});

// Check if an order is unlocked by current user
radarRouter.get('/orders/:id/unlock-status', authenticate, (req, res) => {
  try {
    const isUnlocked = db.prepare('SELECT id FROM unlocked_contacts WHERE user_id = ? AND order_id = ?').get(req.user.id, req.params.id);

    if (isUnlocked) {
      const order = db.prepare(`
        SELECT u.name as client_name, u.phone as client_phone
        FROM orders o
        JOIN users u ON o.client_id = u.id
        WHERE o.id = ?
      `).get(req.params.id);

      return res.json({
        unlocked: true,
        client_name: order?.client_name,
        client_phone: order?.client_phone,
        client_whatsapp: order?.client_phone
      });
    }

    res.json({ unlocked: false });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao checar status de desbloqueio.' });
  }
});

export const OFFICIAL_PIX_KEY = 'c8b36d11-7899-4ce7-999a-7ac85399dd71';
export const OFFICIAL_PIX_NAME = 'TREVIA SERVICOS';
export const OFFICIAL_PIX_CITY = 'JOINVILLE';

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixEMV(key, amount, identifier = '***', name = OFFICIAL_PIX_NAME, city = OFFICIAL_PIX_CITY) {
  const formattedAmount = Number(amount).toFixed(2);
  const keyLen = String(key.length).padStart(2, '0');
  const merchantAccountInfo = `0014br.gov.bcb.pix01${keyLen}${key}`;
  const maiLen = String(merchantAccountInfo.length).padStart(2, '0');

  const amountStr = String(formattedAmount);
  const amountLen = String(amountStr.length).padStart(2, '0');

  const cleanName = name.slice(0, 25).toUpperCase();
  const nameLen = String(cleanName.length).padStart(2, '0');

  const cleanCity = city.slice(0, 15).toUpperCase();
  const cityLen = String(cleanCity.length).padStart(2, '0');

  const cleanId = (identifier || '***').slice(0, 25).replace(/[^a-zA-Z0-9]/g, '');
  const idField = `05${String(cleanId.length).padStart(2, '0')}${cleanId}`;
  const addDataField = `62${String(idField.length).padStart(2, '0')}${idField}`;

  const rawPayload = 
    `000201` +
    `26${maiLen}${merchantAccountInfo}` +
    `52040000` +
    `5303986` +
    `54${amountLen}${amountStr}` +
    `5802BR` +
    `59${nameLen}${cleanName}` +
    `60${cityLen}${cleanCity}` +
    `${addDataField}` +
    `6304`;

  return rawPayload + crc16(rawPayload);
}

const CREDIT_PACKAGES = {
  starter: { id: 'starter', credits: 3, price: 19.90, name: 'Pacote Básico (3 Contatos)' },
  pro: { id: 'pro', credits: 8, price: 39.90, name: 'Pacote Profissional (8 Contatos)', highlight: true },
  turbo: { id: 'turbo', credits: 15, price: 59.90, name: 'Pacote Turbo (15 Contatos)' }
};

// Create a PIX recharge order (requires payment confirmation before credits release)
radarRouter.post('/credits/order', authenticate, (req, res) => {
  try {
    const { package_id = 'pro' } = req.body;
    const selectedPkg = CREDIT_PACKAGES[package_id] || CREDIT_PACKAGES.pro;

    const rechargeId = 'rec-' + uuidv4().slice(0, 12);
    const now = new Date().toISOString();
    const pixCode = generatePixEMV(OFFICIAL_PIX_KEY, selectedPkg.price, rechargeId);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(pixCode)}`;

    db.prepare(`
      INSERT INTO credit_recharges (
        id, user_id, package_id, credits, amount, pix_key, pix_code, qr_code_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)
    `).run(
      rechargeId,
      req.user.id,
      selectedPkg.id,
      selectedPkg.credits,
      selectedPkg.price,
      OFFICIAL_PIX_KEY,
      pixCode,
      qrCodeUrl,
      now
    );

    const recharge = db.prepare('SELECT * FROM credit_recharges WHERE id = ?').get(rechargeId);

    res.status(201).json({
      recharge: {
        ...recharge,
        package: selectedPkg,
        official_pix_key: OFFICIAL_PIX_KEY,
        recipient_name: OFFICIAL_PIX_NAME,
        city: OFFICIAL_PIX_CITY
      },
      message: 'Pedido de recarga gerado! Efetue o PIX para que o pagamento caia diretamente na conta Trevia.'
    });
  } catch (err) {
    console.error('Erro ao gerar pedido de recarga:', err);
    res.status(500).json({ error: 'Erro ao gerar pedido de recarga PIX.' });
  }
});

// Submit payment proof / transaction ID
radarRouter.post('/credits/submit-proof', authenticate, (req, res) => {
  try {
    const { recharge_id, proof_text = '' } = req.body;

    if (!recharge_id) {
      return res.status(400).json({ error: 'Identificador da recarga é obrigatório.' });
    }

    const recharge = db.prepare('SELECT * FROM credit_recharges WHERE id = ? AND user_id = ?').get(recharge_id, req.user.id);
    if (!recharge) {
      return res.status(404).json({ error: 'Pedido de recarga não encontrado.' });
    }

    if (recharge.status === 'aprovado') {
      return res.status(400).json({ error: 'Esta recarga já foi aprovada e creditada.' });
    }

    db.prepare(`
      UPDATE credit_recharges 
      SET status = 'em_analise', transaction_proof = ?
      WHERE id = ?
    `).run(proof_text.trim(), recharge_id);

    res.json({
      success: true,
      status: 'em_analise',
      message: 'Comprovante registrado com sucesso! Nosso time está verificando o recebimento do PIX para liberar seus créditos.'
    });
  } catch (err) {
    console.error('Erro ao registrar comprovante:', err);
    res.status(500).json({ error: 'Erro ao registrar comprovante.' });
  }
});

// User's own recharge orders
radarRouter.get('/credits/my-recharges', authenticate, (req, res) => {
  try {
    const recharges = db.prepare(`
      SELECT * FROM credit_recharges 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(req.user.id);

    res.json({ recharges });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico de recargas.' });
  }
});

// Admin-only test recharge / Override (Prevents normal users from gaining free credits without payment)
radarRouter.post('/credits/recharge', authenticate, (req, res) => {
  try {
    const { package_id = 'starter' } = req.body;

    // Security Gate: Only admins can perform direct instant crediting without prior verified payment
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'A liberação de créditos é realizada após a confirmação do pagamento via PIX para a chave oficial: ' + OFFICIAL_PIX_KEY,
        requires_pix: true,
        official_pix_key: OFFICIAL_PIX_KEY
      });
    }

    const selectedPkg = CREDIT_PACKAGES[package_id] || CREDIT_PACKAGES.starter;
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET credits = credits + ?, updated_at = ? WHERE id = ?').run(
      selectedPkg.credits,
      now,
      req.user.id
    );

    const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

    res.json({
      success: true,
      added_credits: selectedPkg.credits,
      total_credits: updatedUser.credits,
      package: selectedPkg,
      message: `Recarga administrativa de ${selectedPkg.credits} créditos autorizada.`
    });
  } catch (err) {
    console.error('Erro na recarga administrativa:', err);
    res.status(500).json({ error: 'Erro ao processar recarga.' });
  }
});
