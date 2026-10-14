import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

export const reportsRouter = express.Router();

reportsRouter.post('/', authenticate, (req, res) => {
  try {
    const { target_type, target_id, reason, details = '' } = req.body;

    if (!target_type || !['order', 'profile', 'proposal'].includes(target_type)) {
      return res.status(400).json({ error: 'Tipo de denúncia inválido.' });
    }

    if (!target_id) {
      return res.status(400).json({ error: 'Item alvo da denúncia é obrigatório.' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Informe um motivo claro para a denúncia (mínimo 5 caracteres).' });
    }

    const id = 'rep-' + uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)
    `).run(id, req.user.id, target_type, target_id, reason.trim(), details.trim(), now);

    res.status(201).json({ message: 'Denúncia registrada com sucesso. A moderação irá analisar o caso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar denúncia.' });
  }
});
