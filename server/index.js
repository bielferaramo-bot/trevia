import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { locationsRouter } from './routes/locations.js';
import { ordersRouter } from './routes/orders.js';
import { proposalsRouter } from './routes/proposals.js';
import { professionalsRouter } from './routes/professionals.js';
import { reportsRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { alertsRouter } from './routes/alerts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://trevia.work',
  'https://www.trevia.work',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('trevia.work')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/professionals', professionalsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/alerts', alertsRouter);

app.get(['/api/health', '/healthz'], (req, res) => {
  res.json({
    status: 'ok',
    app: 'Trevia API',
    region: 'Joinville e Região - SC',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// 404 handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

// SPA fallback for non-API routes
if (fs.existsSync(clientDistPath)) {
  app.use((req, res) => {
    res.sendFile('index.html', { root: clientDistPath });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`[Trevia API] Servidor rodando em http://localhost:${PORT}`);
});

export default app;
