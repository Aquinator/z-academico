require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./utils/database');
const { createTable } = require('./models/User');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    logger.info('Iniciando auth-service...', { port: PORT, env: process.env.NODE_ENV });

    await testConnection();
    await createTable();

    app.listen(PORT, () => {
      logger.info(`auth-service rodando na porta ${PORT}`);
    });
  } catch (err) {
    logger.error('Falha ao iniciar o serviço', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido — encerrando graciosamente');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido — encerrando graciosamente');
  process.exit(0);
});

bootstrap();
