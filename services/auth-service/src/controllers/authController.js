const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { loginAttempts, activeUsers } = require('../utils/metrics');

const SALT_ROUNDS = 12;

// ── POST /auth/register ────────────────────────────────────
async function register(req, res) {
  try {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: nome, email, senha',
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 8 caracteres',
      });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'E-mail já cadastrado',
      });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const user = await User.create({ nome, email, senhaHash, tipo });

    // Atualiza métrica de usuários
    const total = await User.count();
    activeUsers.set(total);

    logger.info('Novo usuário registrado', { userId: user.id, tipo: user.tipo });

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: user,
    });
  } catch (err) {
    logger.error('Erro ao registrar usuário', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

// ── POST /auth/login ───────────────────────────────────────
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'E-mail e senha são obrigatórios',
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      loginAttempts.inc({ status: 'failure' });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      loginAttempts.inc({ status: 'failure' });
      logger.warn('Tentativa de login falhou', { email });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    loginAttempts.inc({ status: 'success' });
    logger.info('Login realizado com sucesso', { userId: user.id });

    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo },
      },
    });
  } catch (err) {
    logger.error('Erro ao fazer login', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

// ── GET /auth/me ───────────────────────────────────────────
async function me(req, res) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    logger.error('Erro ao buscar perfil', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

// ── POST /auth/validate ────────────────────────────────────
// Endpoint interno: outros serviços chamam para validar um token
async function validate(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token obrigatório' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
    }

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
    logger.error('Erro ao validar token', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

module.exports = { register, login, me, validate };
