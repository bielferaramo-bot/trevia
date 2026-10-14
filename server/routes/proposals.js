import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';
import { notifyClientOfNewProposal } from '../services/whatsapp.js';

export const proposalsRouter = express.Router();

// Provider submits a proposal / expression of interest
proposalsRouter.post('/orders/:id/proposals', authenticate, (req, res) => {
  try {
    const orderId = req.params.id;
    const { message, proposed_value, estimated_time } = req.body;

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Apresente uma mensagem com pelo menos 10 caracteres explicando sua disponibilidade ou proposta.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido de serviço não encontrado.' });
    }

    if (order.client_id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode enviar uma proposta para o seu próprio pedido.' });
    }

    if (order.status !== 'aberto') {
      return res.status(400).json({ error: `Este pedido está com a situação "${order.status}" e não aceita mais novas propostas.` });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM proposals WHERE order_id = ? AND provider_id = ?').get(orderId, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Você já enviou uma manifestação ou proposta para este pedido.' });
    }

    const id = 'prop-' + uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO proposals (
        id, order_id, provider_id, message, proposed_value, estimated_time, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)
    `).run(
      id,
      orderId,
      req.user.id,
      message.trim(),
      proposed_value ? parseFloat(proposed_value) : null,
      estimated_time ? estimated_time.trim() : null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);

    // Dispara alerta WhatsApp sigiloso para o cliente proprietário
    notifyClientOfNewProposal(order, { ...created, provider_name: req.user.name })
      .catch(err => console.error('Erro ao notificar cliente via WhatsApp:', err));

    res.status(201).json({
      proposal: created,
      message: 'Proposta enviada com sucesso! O cliente receberá sua manifestação.'
    });
  } catch (err) {
    console.error('Erro ao enviar proposta:', err);
    res.status(500).json({ error: 'Erro interno ao registrar proposta.' });
  }
});

// Provider lists proposals they sent
proposalsRouter.get('/my', authenticate, (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT
        p.*,
        o.title as order_title,
        o.city as order_city,
        o.neighborhood as order_neighborhood,
        o.status as order_status,
        c.name as category_name,
        u.name as client_name
      FROM proposals p
      JOIN orders o ON p.order_id = o.id
      LEFT JOIN categories c ON o.category_id = c.id
      JOIN users u ON o.client_id = u.id
      WHERE p.provider_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.json({ proposals });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar suas propostas.' });
  }
});

// Client updates proposal status ('aceita', 'recusada')
proposalsRouter.patch('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    if (!['pendente', 'aceita', 'recusada'].includes(status)) {
      return res.status(400).json({ error: 'Status da proposta inválido.' });
    }

    const proposal = db.prepare(`
      SELECT p.*, o.client_id
      FROM proposals p
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada.' });
    }

    if (proposal.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o cliente responsável pelo pedido pode atualizar esta proposta.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?').run(status, now, proposal.id);

    res.json({ message: `Proposta marcada como ${status}.`, status });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar situação da proposta.' });
  }
});
