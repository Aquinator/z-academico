const axios = require('axios');
const logger = require('./logger');

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

/**
 * Valida um JWT chamando o auth-service.
 * Retorna o payload decodificado ou lança erro.
 */
async function validateToken(token) {
  try {
    const response = await axios.post(
      `${AUTH_URL}/auth/validate`,
      { token },
      { timeout: 5000 }
    );
    return response.data.data; // { sub, email, tipo, iat, exp }
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('TOKEN_INVALID');
    }
    logger.error('Erro ao contactar auth-service', { error: err.message });
    throw new Error('AUTH_SERVICE_UNAVAILABLE');
  }
}

module.exports = { validateToken };