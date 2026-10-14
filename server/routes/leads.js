import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';

export const leadsRouter = express.Router();

/**
 * POST /api/leads
 * Public endpoint para captura de leads do formulário rápido (Home, landing pages de tráfego pago)
 */
leadsRouter.post('/', (req, res) => {
  try {
    const { name, phone, service, neighborhood, details, source } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Por favor, informe seu nome.' });
    }

    if (!phone || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Por favor, informe um WhatsApp válido com DDD.' });
    }

    // Sanitiza e formata telefone
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10 || cleanDigits.length > 13) {
      return res.status(400).json({ error: 'Número de WhatsApp inválido. Digite o DDD + número (ex: 47 99999-9999).' });
    }

    const leadId = `lead-${uuidv4()}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO leads (id, name, phone, service, neighborhood, details, source, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'novo', ?)
    `);

    insertStmt.run(
      leadId,
      name.trim(),
      phone.trim(),
      service || 'Serviço Geral',
      neighborhood || 'Joinville',
      details ? details.trim() : '',
      source || 'express_home',
      now
    );

    console.log(`[Trevia Leads] Novo lead capturado: ${name} (${phone}) - ${service} em ${neighborhood}`);

    res.status(201).json({
      success: true,
      lead_id: leadId,
      message: 'Lead registrado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao salvar lead:', err);
    res.status(500).json({ error: 'Erro interno ao salvar lead.' });
  }
});

/**
 * GET /api/leads
 * Protected (Admin only) - Lista todos os leads capturados para follow-up comercial
 */
leadsRouter.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const leads = db.prepare(`
      SELECT * FROM leads ORDER BY created_at DESC
    `).all();

    res.json({ leads });
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    res.status(500).json({ error: 'Erro ao listar leads.' });
  }
});

/**
 * PATCH /api/leads/:id/status
 * Protected (Admin only) - Atualiza status do lead ('novo', 'em_contato', 'convertido', 'arquivado')
 */
leadsRouter.patch('/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['novo', 'em_contato', 'convertido', 'arquivado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const updateStmt = db.prepare(`
      UPDATE leads SET status = ? WHERE id = ?
    `);
    const result = updateStmt.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    res.json({ success: true, id, status });
  } catch (err) {
    console.error('Erro ao atualizar status do lead:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do lead.' });
  }
});

/**
 * DELETE /api/leads/:id
 * Protected (Admin only) - Remove lead
 */
leadsRouter.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const deleteStmt = db.prepare('DELETE FROM leads WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir lead:', err);
    res.status(500).json({ error: 'Erro ao excluir lead.' });
  }
});
