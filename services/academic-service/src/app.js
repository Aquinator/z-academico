const express = require('express');
const cors = require('cors');
const { register, metricsMiddleware } = require('./utils/metrics');
const alunoRoutes = require('./routes/alunoRoutes');
const disciplinaRoutes = require('./routes/disciplinaRoutes');
const turmaRoutes = require('./routes/turmaRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'academic-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end();
  }
});

app.use('/alunos', alunoRoutes);
app.use('/disciplinas', disciplinaRoutes);
app.use('/turmas', turmaRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota nao encontrada' });
});

module.exports = app;
