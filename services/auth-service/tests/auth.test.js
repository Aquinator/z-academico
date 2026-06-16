const request = require('supertest');

// Mock do banco de dados ANTES de importar o app
jest.mock('../src/utils/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/User', () => ({
  createTable: jest.fn().mockResolvedValue(true),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  count: jest.fn().mockResolvedValue(1),
}));

const app = require('../src/app');
const User = require('../src/models/User');

// ── Variáveis de ambiente para os testes ──────────────────
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.JWT_EXPIRES_IN = '1h';

describe('Auth Service', () => {

  // ── Health Check ─────────────────────────────────────────
  describe('GET /health', () => {
    it('deve retornar status 200 com payload correto', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('auth-service');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  // ── POST /auth/register ───────────────────────────────────
  describe('POST /auth/register', () => {
    beforeEach(() => {
      User.findByEmail.mockReset();
      User.create.mockReset();
    });

    it('deve registrar um novo usuário com sucesso', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 'uuid-123',
        nome: 'João Silva',
        email: 'joao@test.com',
        tipo: 'aluno',
        criado_em: new Date().toISOString(),
      });

      const res = await request(app).post('/auth/register').send({
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'senha1234',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).not.toHaveProperty('senha_hash');
    });

    it('deve retornar 400 quando campos obrigatórios estão ausentes', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'joao@test.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('deve retornar 400 quando a senha tem menos de 8 caracteres', async () => {
      const res = await request(app).post('/auth/register').send({
        nome: 'João',
        email: 'joao@test.com',
        senha: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('deve retornar 409 quando e-mail já está cadastrado', async () => {
      User.findByEmail.mockResolvedValue({ id: 'existing', email: 'joao@test.com' });

      const res = await request(app).post('/auth/register').send({
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'senha1234',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /auth/login ──────────────────────────────────────
  describe('POST /auth/login', () => {
    const bcrypt = require('bcryptjs');

    beforeEach(() => {
      User.findByEmail.mockReset();
    });

    it('deve realizar login com credenciais válidas', async () => {
      const senhaHash = await bcrypt.hash('senha1234', 1); // rounds baixo para teste rápido

      User.findByEmail.mockResolvedValue({
        id: 'uuid-123',
        nome: 'João Silva',
        email: 'joao@test.com',
        senha_hash: senhaHash,
        tipo: 'aluno',
      });

      const res = await request(app).post('/auth/login').send({
        email: 'joao@test.com',
        senha: 'senha1234',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).not.toHaveProperty('senha_hash');
    });

    it('deve retornar 401 com e-mail inexistente', async () => {
      User.findByEmail.mockResolvedValue(null);

      const res = await request(app).post('/auth/login').send({
        email: 'naoexiste@test.com',
        senha: 'senha1234',
      });

      expect(res.status).toBe(401);
    });

    it('deve retornar 401 com senha incorreta', async () => {
      const senhaHash = await bcrypt.hash('correta1234', 1);
      User.findByEmail.mockResolvedValue({
        id: 'uuid-123',
        email: 'joao@test.com',
        senha_hash: senhaHash,
        tipo: 'aluno',
      });

      const res = await request(app).post('/auth/login').send({
        email: 'joao@test.com',
        senha: 'errada1234',
      });

      expect(res.status).toBe(401);
    });

    it('deve retornar 400 quando campos estão ausentes', async () => {
      const res = await request(app).post('/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Rota inexistente ──────────────────────────────────────
  describe('Rotas não encontradas', () => {
    it('deve retornar 404 para rotas desconhecidas', async () => {
      const res = await request(app).get('/rota-inexistente');
      expect(res.status).toBe(404);
    });
  });
});
