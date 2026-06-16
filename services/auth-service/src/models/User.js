const { query } = require('../utils/database');

/**
 * Cria a tabela de usuários se não existir.
 * Chamado na inicialização do serviço.
 */
async function createTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome        VARCHAR(150)  NOT NULL,
      email       VARCHAR(255)  NOT NULL UNIQUE,
      senha_hash  VARCHAR(255)  NOT NULL,
      tipo        VARCHAR(20)   NOT NULL DEFAULT 'aluno'
                    CHECK (tipo IN ('aluno', 'professor', 'admin')),
      criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    'SELECT id, nome, email, tipo, criado_em FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ nome, email, senhaHash, tipo = 'aluno' }) {
  const result = await query(
    `INSERT INTO users (nome, email, senha_hash, tipo)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, email, tipo, criado_em`,
    [nome, email, senhaHash, tipo]
  );
  return result.rows[0];
}

async function count() {
  const result = await query('SELECT COUNT(*) AS total FROM users');
  return parseInt(result.rows[0].total);
}

module.exports = { createTable, findByEmail, findById, create, count };
