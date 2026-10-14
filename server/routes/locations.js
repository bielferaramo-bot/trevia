import express from 'express';
import { db } from '../db.js';

export const locationsRouter = express.Router();

locationsRouter.get('/', (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT id, city, state, neighborhoods_json, is_active
      FROM locations
      WHERE is_active = 1
      ORDER BY city ASC
    `).all();

    const formatted = locations.map(loc => ({
      id: loc.id,
      city: loc.city,
      state: loc.state,
      neighborhoods: JSON.parse(loc.neighborhoods_json || '[]')
    }));

    res.json({ locations: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar localidades.' });
  }
});
