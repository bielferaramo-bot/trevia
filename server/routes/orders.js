import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate, optionalAuthenticate, generateToken } from '../auth.js';
import { notifyProvidersOfNewOrder } from '../services/whatsapp.js';
import { radarBroadcaster } from '../services/radarBroadcaster.js';

export const ordersRouter = express.Router();

// List public eligible orders
ordersRouter.get('/', optionalAuthenticate, (req, res) => {
  try {
    const {
      q,
      category_id,
      city,
      neighborhood,
      timeframe,
      status = 'aberto',
      sort = 'recent',
      limit = 20,
      offset = 0
    } = req.query;

    const conditions = [];
    const params = [];

    // Filter by status
    if (status && status !== 'todos') {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (category_id) {
      conditions.push('o.category_id = ?');
      params.push(category_id);
    }

    if (city) {
      conditions.push('LOWER(o.city) = LOWER(?)');
      params.push(city);
    }

    if (neighborhood) {
      conditions.push('LOWER(o.neighborhood) = LOWER(?)');
      params.push(neighborhood);
    }

    if (timeframe) {
      conditions.push('o.timeframe = ?');
      params.push(timeframe);
    }

    if (q && q.trim()) {
      conditions.push('(o.title LIKE ? OR o.description LIKE ?)');
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'oldest' ? 'ORDER BY o.created_at ASC' : 'ORDER BY o.created_at DESC';

    const countSql = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    const querySql = `
      SELECT
        o.id,
        o.title,
        o.description,
        o.category_id,
        c.name as category_name,
        c.slug as category_slug,
        o.city,
        o.neighborhood,
        o.timeframe,
        o.estimated_budget,
        o.status,
        o.created_at,
        o.updated_at,
        (SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id) as proposals_count,
        (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.order_id = o.id) as unlocked_count,
        COALESCE(o.max_unlocks, 3) as max_unlocks
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const orders = db.prepare(querySql).all(...params, Number(limit), Number(offset));

    res.json({
      orders,
      total: totalCount,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
});

// List authenticated client's own orders
ordersRouter.get('/my/list', authenticate, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        o.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id) as proposals_count
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.client_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar seus pedidos.' });
  }
});

// Create new order (supports both authenticated clients and guest Post-First flow)
ordersRouter.post('/', optionalAuthenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      category_id,
      city,
      neighborhood = '',
      timeframe = 'a_combinar',
      estimated_budget = null,
      client_name,
      client_phone
    } = req.body;

    if (!title || title.trim().length < 5) {
      return res.status(400).json({ error: 'O título deve ter no mínimo 5 caracteres.' });
    }

    if (!description || description.trim().length < 15) {
      return res.status(400).json({ error: 'A descrição deve ter no mínimo 15 caracteres para orientar os profissionais.' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Selecione uma categoria para o serviço.' });
    }

    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Categoria selecionada não é válida.' });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ error: 'Informe a cidade onde o serviço será realizado.' });
    }

    let clientId = req.user ? req.user.id : null;
    let authPayload = null;

    // Se o usuário não estiver logado, fluxo "Post-First" com validação de Nome e WhatsApp
    if (!clientId) {
      if (!client_name || client_name.trim().length < 2) {
        return res.status(400).json({ error: 'Por favor, informe seu nome para contato.' });
      }
      const cleanPhone = (client_phone || '').replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return res.status(400).json({ error: 'Informe um WhatsApp válido com DDD (Ex: 47 99999-9999).' });
      }

      // Procura se já existe um usuário com esse telefone
      let existingUser = db.prepare('SELECT id, name, email, role, phone, status FROM users WHERE phone = ?').get(cleanPhone);
      if (!existingUser) {
        // Cria nova conta de cliente silenciosamente sem exigir senha inicial
        const newUserId = 'usr-' + uuidv4();
        const now = new Date().toISOString();
        const virtualEmail = `${cleanPhone}@cliente.trevia.com.br`;
        const autoHash = bcrypt.hashSync(uuidv4(), 10);

        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'client', ?, ?, ?)
        `).run(newUserId, client_name.trim(), virtualEmail, autoHash, cleanPhone, now, now);

        existingUser = {
          id: newUserId,
          name: client_name.trim(),
          email: virtualEmail,
          role: 'client',
          phone: cleanPhone,
          status: 'active'
        };
      }

      clientId = existingUser.id;
      const token = generateToken(existingUser);
      authPayload = { token, user: existingUser };
    }

    const id = 'ord-' + uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO orders (
        id, client_id, title, description, category_id, city, neighborhood,
        timeframe, estimated_budget, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberto', ?, ?)
    `).run(
      id,
      clientId,
      title.trim(),
      description.trim(),
      category_id,
      city.trim(),
      neighborhood ? neighborhood.trim() : '',
      timeframe,
      estimated_budget ? parseFloat(estimated_budget) : null,
      now,
      now
    );

    const created = db.prepare(`
      SELECT o.*, c.name as category_name
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.id = ?
    `).get(id);

    // Dispara alerta automático para prestadores cadastrados no Radar de Oportunidades via WhatsApp
    notifyProvidersOfNewOrder(created).catch(err => console.error('Erro ao disparar WhatsApp de novo pedido:', err));

    // Dispara alerta instantâneo em tempo real estilo Uber para o Radar sonoro
    try {
      radarBroadcaster.broadcastNewOrder(created);
    } catch (e) {
      console.warn('Erro ao emitir alerta no radar:', e.message);
    }

    res.status(201).json({
      order: {
        ...created,
        is_owner: true,
        proposals: [],
        proposals_count: 0
      },
      token: authPayload ? authPayload.token : undefined,
      user: authPayload ? authPayload.user : undefined,
      message: 'Pedido publicado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ error: 'Erro interno ao publicar pedido.' });
  }
});

// Get order details
ordersRouter.get('/:id', optionalAuthenticate, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT
        o.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as client_name,
        u.phone as client_phone,
        (SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id) as proposals_count
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      LEFT JOIN users u ON o.client_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const isOwner = Boolean(
      (req.user && String(req.user.id) === String(order.client_id)) ||
      (req.user && req.user.phone && order.client_phone && String(req.user.phone).replace(/\D/g, '') === String(order.client_phone).replace(/\D/g, ''))
    );
    const isAdmin = Boolean(req.user && req.user.role === 'admin');

    // Check if the viewing provider has unlocked this contact with credits
    const isUnlocked = req.user ? db.prepare('SELECT id FROM unlocked_contacts WHERE user_id = ? AND order_id = ?').get(req.user.id, order.id) : null;
    const canViewContact = isOwner || isAdmin || !!isUnlocked;

    // If client is viewing their own order, or admin, return proposals
    let proposals = [];
    if (isOwner || isAdmin) {
      proposals = db.prepare(`
        SELECT
          p.*,
          u.name as provider_name,
          u.phone as provider_phone,
          pr.slug as provider_slug,
          pr.bio as provider_bio,
          pr.whatsapp as provider_whatsapp
        FROM proposals p
        JOIN users u ON p.provider_id = u.id
        LEFT JOIN profiles pr ON pr.user_id = u.id
        WHERE p.order_id = ?
        ORDER BY p.created_at DESC
      `).all(order.id);
    }

    // Check if the current logged in user (as provider) has already submitted a proposal
    let myProposal = null;
    if (req.user && !isOwner) {
      myProposal = db.prepare(`
        SELECT id, message, proposed_value, estimated_time, status, created_at
        FROM proposals
        WHERE order_id = ? AND provider_id = ?
      `).get(order.id, req.user.id);
    }

    // Sanitize client info if viewer is not owner and not unlocked
    const rawPhone = order.client_phone || '';
    const maskedPhone = rawPhone.length > 4 ? `(47) 9****-**${rawPhone.slice(-2)}` : '(47) 9****-****';

    // Scarcity & spots calculation (Exclusivity trigger)
    const maxUnlocks = order.max_unlocks || 3;
    const totalUnlocked = db.prepare('SELECT COUNT(*) as count FROM unlocked_contacts WHERE order_id = ?').get(order.id)?.count || 0;
    const spotsLeft = Math.max(0, maxUnlocks - totalUnlocked);

    let refundRequest = null;
    if (req.user) {
      refundRequest = db.prepare('SELECT id, reason, status, created_at FROM credit_refunds WHERE user_id = ? AND order_id = ?').get(req.user.id, order.id);
    }

    const safeOrder = {
      ...order,
      client_phone: canViewContact ? rawPhone : maskedPhone,
      is_contact_unlocked: canViewContact,
      is_owner: isOwner,
      has_submitted_proposal: !!myProposal,
      my_proposal: myProposal,
      proposals: proposals,
      max_unlocks: maxUnlocks,
      unlocked_count: totalUnlocked,
      spots_left: spotsLeft,
      spots_exhausted: spotsLeft === 0,
      refund_request: refundRequest
    };

    res.json({ order: safeOrder });
  } catch (err) {
    console.error('Erro ao obter detalhes do pedido:', err);
    res.status(500).json({ error: 'Erro ao carregar pedido.' });
  }
});

// Update order
ordersRouter.put('/:id', authenticate, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Você não tem permissão para editar este pedido.' });
    }

    if (order.status === 'concluido' || order.status === 'cancelado') {
      return res.status(400).json({ error: 'Pedidos concluídos ou cancelados não podem ser alterados.' });
    }

    const {
      title,
      description,
      category_id,
      city,
      neighborhood,
      timeframe,
      estimated_budget
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE orders SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        city = COALESCE(?, city),
        neighborhood = COALESCE(?, neighborhood),
        timeframe = COALESCE(?, timeframe),
        estimated_budget = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      title ? title.trim() : null,
      description ? description.trim() : null,
      category_id || null,
      city ? city.trim() : null,
      neighborhood !== undefined ? neighborhood.trim() : null,
      timeframe || null,
      estimated_budget !== undefined && estimated_budget !== null && estimated_budget !== '' ? parseFloat(estimated_budget) : null,
      now,
      order.id
    );

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ order: updated, message: 'Pedido atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pedido.' });
  }
});

// Update status (e.g. 'em_negociacao', 'concluido', 'cancelado', 'aberto')
ordersRouter.patch('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['aberto', 'em_negociacao', 'concluido', 'cancelado'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Situação inválida fornecida.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o estado deste pedido.' });
    }

    const now = new Date().toISOString();
    const closedAt = (status === 'concluido' || status === 'cancelado') ? now : null;

    db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = ?, closed_at = ?
      WHERE id = ?
    `).run(status, now, closedAt, order.id);

    res.json({ message: `Situação do pedido alterada para "${status}".`, status });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar estado do pedido.' });
  }
});
