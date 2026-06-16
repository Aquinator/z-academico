const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação não fornecido',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('Token inválido recebido', { error: err.message });
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido',
    });
  }
}

function authorize(...tipos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    if (!tipos.includes(req.user.tipo)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: permissão insuficiente',
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
