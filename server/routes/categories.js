import express from 'express';
import { db } from '../db.js';

export const categoriesRouter = express.Router();

categoriesRouter.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, slug, description, icon, is_active, display_order
      FROM categories
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `).all();

    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar categorias.' });
  }
});
