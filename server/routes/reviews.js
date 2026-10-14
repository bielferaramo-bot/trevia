import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

export const reviewsRouter = express.Router();

/**
 * POST /api/reviews
 * Envia uma avaliação bilateral (Cliente avalia Prestador OU Prestador avalia Cliente)
 */
reviewsRouter.post('/', authenticate, (req, res) => {
  try {
    const { order_id, target_user_id, rating, comment, tags } = req.body;
    const reviewerId = req.user.id;

    if (!order_id || !target_user_id) {
      return res.status(400).json({ error: 'Pedido e usuário avaliado são obrigatórios.' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'A nota deve ser um número inteiro de 1 a 5 estrelas.' });
    }

    if (!comment || comment.trim().length < 3) {
      return res.status(400).json({ error: 'O comentário da avaliação deve ter pelo menos 3 caracteres.' });
    }

    if (reviewerId === target_user_id) {
      return res.status(400).json({ error: 'Você não pode avaliar a si mesmo.' });
    }

    // 1. Verifica se o pedido existe
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // 2. Valida papéis e participação no pedido
    let targetType = 'provider';
    const isReviewerClient = reviewerId === order.client_id;

    if (isReviewerClient) {
      // Cliente está avaliando o prestador
      targetType = 'provider';
      // Verifica se o prestador participou do pedido (enviou proposta ou desbloqueou contato)
      const hasProposal = db.prepare('SELECT id FROM proposals WHERE order_id = ? AND provider_id = ?').get(order_id, target_user_id);
      const hasUnlocked = db.prepare('SELECT id FROM unlocked_contacts WHERE order_id = ? AND user_id = ?').get(order_id, target_user_id);

      if (!hasProposal && !hasUnlocked) {
        return res.status(403).json({ error: 'Apenas prestadores que enviaram proposta ou atenderam este pedido podem ser avaliados.' });
      }
    } else {
      // Prestador está avaliando o cliente
      targetType = 'client';
      if (target_user_id !== order.client_id) {
        return res.status(400).json({ error: 'Como prestador, você só pode avaliar o contratante deste pedido.' });
      }

      // Verifica se o prestador realmente participou do pedido
      const hasProposal = db.prepare('SELECT id FROM proposals WHERE order_id = ? AND provider_id = ?').get(order_id, reviewerId);
      const hasUnlocked = db.prepare('SELECT id FROM unlocked_contacts WHERE order_id = ? AND user_id = ?').get(order_id, reviewerId);

      if (!hasProposal && !hasUnlocked) {
        return res.status(403).json({ error: 'Você precisa ter enviado uma proposta ou participado deste pedido para avaliar o cliente.' });
      }
    }

    // 3. Impede avaliação duplicada no mesmo pedido para o mesmo alvo
    const existing = db.prepare(`
      SELECT id FROM reviews
      WHERE order_id = ? AND reviewer_id = ? AND target_user_id = ?
    `).get(order_id, reviewerId, target_user_id);

    if (existing) {
      return res.status(400).json({ error: 'Você já avaliou este usuário neste pedido.' });
    }

    // 4. Salva a avaliação
    const reviewId = `rev-${uuidv4()}`;
    const now = new Date().toISOString();
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : '[]';

    const insertStmt = db.prepare(`
      INSERT INTO reviews (id, order_id, reviewer_id, target_user_id, target_type, rating, comment, tags_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      reviewId,
      order_id,
      reviewerId,
      target_user_id,
      targetType,
      numRating,
      comment.trim(),
      tagsJson,
      now,
      now
    );

    console.log(`[Trevia Reviews] Nova avaliação: ${req.user.name} avaliou usuário ${target_user_id} com ${numRating} estrelas (${targetType})`);

    res.status(201).json({
      success: true,
      review: {
        id: reviewId,
        order_id,
        reviewer_id: reviewerId,
        reviewer_name: req.user.name,
        target_user_id,
        target_type: targetType,
        rating: numRating,
        comment: comment.trim(),
        tags: Array.isArray(tags) ? tags : [],
        created_at: now
      }
    });
  } catch (err) {
    console.error('Erro ao salvar avaliação:', err);
    res.status(500).json({ error: 'Erro interno ao salvar avaliação.' });
  }
});

/**
 * GET /api/reviews/user/:userId
 * Retorna todas as avaliações recebidas por um usuário com métricas consolidadas
 */
reviewsRouter.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = db.prepare(`
      SELECT r.*,
             u.name as reviewer_name,
             u.avatar_url as reviewer_avatar,
             u.base_neighborhood as reviewer_neighborhood,
             o.title as order_title
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN orders o ON o.id = r.order_id
      WHERE r.target_user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    const formattedReviews = reviews.map(r => ({
      ...r,
      tags: JSON.parse(r.tags_json || '[]')
    }));

    // Calcula média e distribuição de notas
    const total = formattedReviews.length;
    let avg = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (total > 0) {
      const sum = formattedReviews.reduce((acc, r) => {
        if (distribution[r.rating] !== undefined) {
          distribution[r.rating]++;
        }
        return acc + r.rating;
      }, 0);
      avg = Math.round((sum / total) * 10) / 10;
    }

    res.json({
      reviews: formattedReviews,
      total_reviews: total,
      average_rating: avg,
      stats: {
        average_rating: avg,
        total_reviews: total,
        distribution
      }
    });
  } catch (err) {
    console.error('Erro ao buscar avaliações do usuário:', err);
    res.status(500).json({ error: 'Erro ao carregar avaliações.' });
  }
});

/**
 * GET /api/reviews/order/:orderId
 * Retorna as avaliações associadas a um pedido específico
 */
reviewsRouter.get('/order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;

    const reviews = db.prepare(`
      SELECT r.*,
             u.name as reviewer_name,
             u.avatar_url as reviewer_avatar
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      WHERE r.order_id = ?
      ORDER BY r.created_at DESC
    `).all(orderId);

    const formatted = reviews.map(r => ({
      ...r,
      tags: JSON.parse(r.tags_json || '[]')
    }));

    res.json({ reviews: formatted });
  } catch (err) {
    console.error('Erro ao buscar avaliações do pedido:', err);
    res.status(500).json({ error: 'Erro ao carregar avaliações do pedido.' });
  }
});
