require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    service: 'academic-service',
    message: `academic-service rodando na porta ${PORT}`,
    timestamp: new Date().toISOString(),
  }));
});
