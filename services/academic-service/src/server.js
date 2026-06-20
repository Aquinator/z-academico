require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./utils/database');
const { createTables } = require('./models/schema');

const PORT = process.env.PORT || 3002;

async function bootstrap() {
  try {
    await testConnection();
    await createTables();

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        level: 'info',
        service: 'academic-service',
        message: `academic-service rodando na porta ${PORT}`,
        timestamp: new Date().toISOString(),
      }));
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      level: 'error',
      service: 'academic-service',
      message: 'Falha ao iniciar o servico',
      error: err.message,
      timestamp: new Date().toISOString(),
    }));
    process.exit(1);
  }
}

bootstrap();
