const express = require('express');
const cors = require('cors');
const { register, metricsMiddleware } = require('./utils/metrics');
const authRoutes = require('./routes/authRoutes');
const logger = require('./utils/logger');

const app = express();

// ── Middlewares globais ────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Métricas Prometheus ────────────────────────────────────
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error('Erro ao expor métricas', { error: err.message });
    res.status(500).end();
  }
});

// ── Rotas de negócio ───────────────────────────────────────
app.use('/auth', authRoutes);

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// ── Error handler global ───────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Erro não tratado', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

module.exports = app;
