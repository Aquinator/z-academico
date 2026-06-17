'use strict';

const request = require('supertest');

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/utils/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/Aluno', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../src/models/Disciplina', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../src/models/Turma', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../src/models/schema', () => ({
  createTables: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/utils/authClient', () => ({
  validateToken: jest.fn().mockResolvedValue({
    sub: 'uuid-user-1',
    email: 'user@test.com',
    tipo: 'admin',
  }),
}));

// ── App (importado após os mocks) ─────────────────────────────────────────────

const app = require('../src/app');

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTH_HEADER = { Authorization: 'Bearer valid-token' };

// ── Casos obrigatórios ────────────────────────────────────────────────────────

describe('Casos obrigatórios (5)', () => {

  // 1 - GET /health
  test('1 · GET /health → 200 + { status: ok }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  // 2 - GET /alunos - lista vazia
  test('2 · GET /alunos → 200 + array vazio', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/alunos').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  // 3 - POST /alunos - campos ausentes
  test('3 · POST /alunos (campos ausentes) → 400 + success: false', async () => {
    const res = await request(app)
      .post('/alunos')
      .set(AUTH_HEADER)
      .send({ usuarioId: 'u1' }); // falta matricula e curso

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 4 - POST /alunos - dados válidos
  test('4 · POST /alunos (dados válidos) → 201 + aluno criado', async () => {
    const Aluno = require('../src/models/Aluno');
    const aluno = { id: 1, usuarioId: 'u1', matricula: '2024001', curso: 'Engenharia' };
    Aluno.create.mockResolvedValueOnce(aluno);

    const res = await request(app)
      .post('/alunos')
      .set(AUTH_HEADER)
      .send({ usuarioId: 'u1', matricula: '2024001', curso: 'Engenharia' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject(aluno);
  });

  // 5 - GET /alunos/:id - não encontrado
  test('5 · GET /alunos/:id (inexistente) → 404 + success: false', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.findById.mockResolvedValueOnce(null);

    const res = await request(app).get('/alunos/999').set(AUTH_HEADER);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ── Casos extras recomendados ─────────────────────────────────────────────────

describe('Casos extras (3)', () => {

  // 6 - GET /alunos sem token
  test('6 · GET /alunos (sem token) → 401', async () => {
    const res = await request(app).get('/alunos');
    expect(res.status).toBe(401);
  });

  // 7 - POST /disciplinas - dados válidos
  test('7 · POST /disciplinas (dados válidos) → 201', async () => {
    const Disciplina = require('../src/models/Disciplina');
    const disc = { id: 1, nome: 'Cálculo', codigo: 'MAT101', cargaHoraria: 80 };
    Disciplina.create.mockResolvedValueOnce(disc);

    const res = await request(app)
      .post('/disciplinas')
      .set(AUTH_HEADER)
      .send({ nome: 'Cálculo', codigo: 'MAT101', cargaHoraria: 80 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject(disc);
  });

  // 8 - DELETE /alunos/:id - ID válido
  test('8 · DELETE /alunos/:id (ID válido) → 204', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.remove.mockResolvedValueOnce(true);

    const res = await request(app).delete('/alunos/1').set(AUTH_HEADER);
    expect(res.status).toBe(204);
  });
});

// ── Casos adicionais ──────────────────────────────────────────────────────────

describe('Casos adicionais', () => {

  test('GET /alunos/:id (encontrado) → 200 + aluno', async () => {
    const Aluno = require('../src/models/Aluno');
    const aluno = { id: 1, matricula: '2024001', curso: 'Engenharia' };
    Aluno.findById.mockResolvedValueOnce(aluno);

    const res = await request(app).get('/alunos/1').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject(aluno);
  });

  test('PUT /alunos/:id (não encontrado) → 404', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.update.mockResolvedValueOnce(null);

    const res = await request(app)
      .put('/alunos/999')
      .set(AUTH_HEADER)
      .send({ curso: 'Medicina' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /alunos/:id (não encontrado) → 404', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.remove.mockResolvedValueOnce(null);

    const res = await request(app).delete('/alunos/999').set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  test('POST /disciplinas (campos ausentes) → 400', async () => {
    const res = await request(app)
      .post('/disciplinas')
      .set(AUTH_HEADER)
      .send({ nome: 'Física' }); // falta codigo e cargaHoraria

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /turmas/:id/matriculas (já matriculado) → 409', async () => {
    const db = require('../src/utils/database');
    const uniqueError = new Error('unique violation');
    uniqueError.code = '23505';
    db.query.mockRejectedValueOnce(uniqueError);

    const res = await request(app)
      .post('/turmas/1/matriculas')
      .set(AUTH_HEADER)
      .send({ alunoId: 2 });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('GET /turmas/:id/matriculas → 200 + array de alunos', async () => {
    const db = require('../src/utils/database');
    const alunos = [{ id: 1, matricula: '2024001' }, { id: 2, matricula: '2024002' }];
    db.query.mockResolvedValueOnce({ rows: alunos });

    const res = await request(app).get('/turmas/1/matriculas').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });
});