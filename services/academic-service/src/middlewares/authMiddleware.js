const { validateToken } = require('../utils/authClient');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await validateToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err.message === 'TOKEN_INVALID') {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
    logger.error('Falha na autenticação', { error: err.message });
    return res.status(503).json({ success: false, message: 'Serviço de autenticação indisponível' });
  }
}

function authorize(...tipos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    if (!tipos.includes(req.user.tipo)) {
      return res.status(403).json({ success: false, message: 'Acesso negado: permissão insuficiente' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };