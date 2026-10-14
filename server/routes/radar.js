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

// Recharge credits simulation / PIX package
radarRouter.post('/credits/recharge', authenticate, (req, res) => {
  try {
    const { package_id = 'starter' } = req.body;

    const packages = {
      starter: { credits: 3, price: 19.90, label: 'Pacote Básico (3 Contatos)' },
      pro: { credits: 8, price: 39.90, label: 'Pacote Profissional (8 Contatos)' },
      turbo: { credits: 15, price: 59.90, label: 'Pacote Turbo (15 Contatos)' }
    };

    const selectedPkg = packages[package_id] || packages.starter;
    const now = new Date().toISOString();

    // Instant credit add for seamless experience (with PIX receipt simulation)
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
      message: `Recarga de ${selectedPkg.credits} créditos confirmada com sucesso!`
    });
  } catch (err) {
    console.error('Erro na recarga de créditos:', err);
    res.status(500).json({ error: 'Erro ao processar recarga.' });
  }
});
