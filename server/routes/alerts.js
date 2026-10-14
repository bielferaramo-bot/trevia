import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const alertsRouter = express.Router();

alertsRouter.post('/', (req, res) => {
  try {
    const name = req.body.name;
    const rawPhone = req.body.phone || req.body.whatsapp || '';
    const category_id = req.body.category_id;
    const locations = req.body.locations || req.body.neighborhoods || [];

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Informe seu nome ou o nome do seu negócio.' });
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: 'Informe um número de WhatsApp válido com DDD (10 ou 11 dígitos).' });
    }

    const id = 'alt-' + uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO provider_alerts (id, name, phone, category_id, locations_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id,
      name.trim(),
      cleanPhone,
      category_id || null,
      JSON.stringify(locations),
      now
    );

    res.status(201).json({
      success: true,
      message: 'Alertas gratuitos ativados com sucesso! Você receberá novos pedidos compatíveis direto no WhatsApp.',
      alert_id: id,
      alert: {
        id,
        name: name.trim(),
        whatsapp: cleanPhone,
        phone: cleanPhone,
        category_id: category_id || null,
        locations
      }
    });
  } catch (err) {
    console.error('Erro ao cadastrar alerta de oportunidades:', err);
    res.status(500).json({ error: 'Erro interno ao salvar alerta.' });
  }
});
