const express = require('express');
const cors = require('cors');

// ── Importação das Rotas ───────────────────────────────────
const alunoRoutes      = require('./routes/alunoRoutes');
const disciplinaRoutes = require('./routes/disciplinaRoutes');
const turmaRoutes      = require('./routes/turmaRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'academic-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Registro das Rotas ─────────────────────────────────────
app.use('/alunos',      alunoRoutes);
app.use('/disciplinas', disciplinaRoutes);
app.use('/turmas',      turmaRoutes);

// ── Handler de Rota Não Encontrada (404) ───────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

module.exports = app;