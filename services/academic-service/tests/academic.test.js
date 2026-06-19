'use strict';

const request = require('supertest');

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/utils/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/Aluno', () => ({
  findAll:  jest.fn(),
  findById: jest.fn(),
  create:   jest.fn(),
  update:   jest.fn(),
  remove:   jest.fn(),
}));

jest.mock('../src/models/Disciplina', () => ({
  findAll:  jest.fn(),
  findById: jest.fn(),
  create:   jest.fn(),
  update:   jest.fn(),
  remove:   jest.fn(),
}));

jest.mock('../src/models/Turma', () => ({
  findAll:  jest.fn(),
  findById: jest.fn(),
  create:   jest.fn(),
  remove:   jest.fn(),
}));

jest.mock('../src/models/schema', () => ({
  createTables: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/utils/authClient', () => ({
  validateToken: jest.fn().mockResolvedValue({
    sub:   'uuid-user-1',
    email: 'user@test.com',
    tipo:  'admin',
  }),
}));

// ── App (importado APÓS os mocks) ─────────────────────────────────────────────

const app = require('../src/app');

// ── Helper ────────────────────────────────────────────────────────────────────

const AUTH = { Authorization: 'Bearer valid-token' };

// =============================================================================
// OBRIGATÓRIOS — mínimo 5 casos exigidos pelo SDD
// =============================================================================

describe('[OBRIGATÓRIO] Health check', () => {
  test('1 · GET /health → 200 + { status: ok }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

describe('[OBRIGATÓRIO] Alunos', () => {
  test('2 · GET /alunos → 200 + array vazio', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/alunos').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  test('3 · POST /alunos (campos ausentes) → 400 + success: false', async () => {
    const res = await request(app)
      .post('/alunos')
      .set(AUTH)
      .send({ usuarioId: 'u1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  test('4 · POST /alunos (dados válidos) → 201 + aluno criado', async () => {
    const Aluno   = require('../src/models/Aluno');
    const payload = { id: 1, usuarioId: 'u1', matricula: '2024001', curso: 'Engenharia de Computação' };
    Aluno.create.mockResolvedValueOnce(payload);

    const res = await request(app)
      .post('/alunos')
      .set(AUTH)
      .send({ usuarioId: 'u1', matricula: '2024001', curso: 'Engenharia de Computação' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject(payload);
  });

  test('5 · GET /alunos/:id (inexistente) → 404 + success: false', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.findById.mockResolvedValueOnce(null);

    const res = await request(app).get('/alunos/99999').set(AUTH);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// EXTRAS — aumentam cobertura para >= 60%
// =============================================================================

describe('[EXTRA] Autenticação', () => {
  test('6 · GET /alunos (sem token) → 401', async () => {
    const res = await request(app).get('/alunos');
    expect(res.status).toBe(401);
  });

  test('7 · GET /disciplinas (sem token) → 401', async () => {
    const res = await request(app).get('/disciplinas');
    expect(res.status).toBe(401);
  });
});

describe('[EXTRA] Alunos — CRUD completo', () => {
  test('8 · GET /alunos/:id (encontrado) → 200 + aluno', async () => {
    const Aluno = require('../src/models/Aluno');
    const aluno = { id: 1, matricula: '2024001', curso: 'Engenharia de Computação' };
    Aluno.findById.mockResolvedValueOnce(aluno);

    const res = await request(app).get('/alunos/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject(aluno);
  });

  test('9 · PUT /alunos/:id (não encontrado) → 404', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.update.mockResolvedValueOnce(null);

    const res = await request(app)
      .put('/alunos/99999')
      .set(AUTH)
      .send({ curso: 'Medicina' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('10 · PUT /alunos/:id (encontrado) → 200 + aluno atualizado', async () => {
    const Aluno   = require('../src/models/Aluno');
    const updated = { id: 1, matricula: '2024001', curso: 'Medicina' };
    Aluno.update.mockResolvedValueOnce(updated);

    const res = await request(app)
      .put('/alunos/1')
      .set(AUTH)
      .send({ curso: 'Medicina' });

    expect(res.status).toBe(200);
    expect(res.body.data.curso).toBe('Medicina');
  });

  test('11 · DELETE /alunos/:id (válido) → 204', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.remove.mockResolvedValueOnce(true);

    const res = await request(app).delete('/alunos/1').set(AUTH);
    expect(res.status).toBe(204);
  });

  test('12 · DELETE /alunos/:id (não encontrado) → 404', async () => {
    const Aluno = require('../src/models/Aluno');
    Aluno.remove.mockResolvedValueOnce(null);

    const res = await request(app).delete('/alunos/99999').set(AUTH);
    expect(res.status).toBe(404);
  });
});

describe('[EXTRA] Disciplinas — CRUD', () => {
  test('13 · GET /disciplinas → 200 + array', async () => {
    const Disciplina = require('../src/models/Disciplina');
    Disciplina.findAll.mockResolvedValueOnce([{ id: 1, nome: 'Cálculo', codigo: 'MAT101', cargaHoraria: 80 }]);

    const res = await request(app).get('/disciplinas').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('14 · POST /disciplinas (campos ausentes) → 400', async () => {
    const res = await request(app)
      .post('/disciplinas')
      .set(AUTH)
      .send({ nome: 'Física' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('15 · POST /disciplinas (dados válidos) → 201', async () => {
    const Disciplina = require('../src/models/Disciplina');
    const disc = { id: 1, nome: 'Cálculo', codigo: 'MAT101', cargaHoraria: 80 };
    Disciplina.create.mockResolvedValueOnce(disc);

    const res = await request(app)
      .post('/disciplinas')
      .set(AUTH)
      .send({ nome: 'Cálculo', codigo: 'MAT101', cargaHoraria: 80 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('16 · GET /disciplinas/:id (inexistente) → 404', async () => {
    const Disciplina = require('../src/models/Disciplina');
    Disciplina.findById.mockResolvedValueOnce(null);

    const res = await request(app).get('/disciplinas/99999').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('17 · DELETE /disciplinas/:id (válido) → 204', async () => {
    const Disciplina = require('../src/models/Disciplina');
    Disciplina.remove.mockResolvedValueOnce(true);

    const res = await request(app).delete('/disciplinas/1').set(AUTH);
    expect(res.status).toBe(204);
  });
});

describe('[EXTRA] Turmas', () => {
  test('18 · GET /turmas → 200 + array', async () => {
    const Turma = require('../src/models/Turma');
    Turma.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/turmas').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('19 · POST /turmas (campos ausentes) → 400', async () => {
    const res = await request(app)
      .post('/turmas')
      .set(AUTH)
      .send({ disciplinaId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('20 · POST /turmas/:id/matriculas (já matriculado) → 409', async () => {
    const db  = require('../src/utils/database');
    const err = new Error('duplicate key value violates unique constraint');
    err.code  = '23505';
    db.query.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/turmas/1/matriculas')
      .set(AUTH)
      .send({ alunoId: 2 });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('21 · GET /turmas/:id/matriculas → 200 + array de alunos', async () => {
    const db = require('../src/utils/database');
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, matricula: '2024001' }] });

    const res = await request(app).get('/turmas/1/matriculas').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('22 · DELETE /turmas/:id (não encontrado) → 404', async () => {
    const Turma = require('../src/models/Turma');
    Turma.remove.mockResolvedValueOnce(null);

    const res = await request(app).delete('/turmas/99999').set(AUTH);
    expect(res.status).toBe(404);
  });
});