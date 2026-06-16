const express = require('express');
const cors = require('cors');

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

// ── TODO: Dev 2 implementa as rotas aqui ──────────────────
// app.use('/alunos', alunoRoutes);
// app.use('/turmas', turmaRoutes);
// app.use('/disciplinas', disciplinaRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

module.exports = app;
