const { query } = require('../utils/database');

/**
 * Cria todas as tabelas do domínio acadêmico.
 * Executado na inicialização do serviço.
 */
async function createTables() {
  await query(`
    -- Disciplinas
    CREATE TABLE IF NOT EXISTS disciplinas (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome          VARCHAR(150) NOT NULL,
      codigo        VARCHAR(20)  NOT NULL UNIQUE,
      carga_horaria INTEGER      NOT NULL CHECK (carga_horaria > 0),
      criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Professores (referencia usuario do auth-service por ID externo)
    CREATE TABLE IF NOT EXISTS professores (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id    UUID         NOT NULL UNIQUE,  -- ID vindo do auth-service
      siape         VARCHAR(20)  NOT NULL UNIQUE,
      departamento  VARCHAR(100) NOT NULL,
      criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Alunos (referencia usuario do auth-service por ID externo)
    CREATE TABLE IF NOT EXISTS alunos (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id    UUID         NOT NULL UNIQUE,  -- ID vindo do auth-service
      matricula     VARCHAR(20)  NOT NULL UNIQUE,
      curso         VARCHAR(100) NOT NULL,
      criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Turmas
    CREATE TABLE IF NOT EXISTS turmas (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      disciplina_id UUID         NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
      professor_id  UUID         NOT NULL REFERENCES professores(id) ON DELETE RESTRICT,
      semestre      VARCHAR(10)  NOT NULL,   -- ex: "2024.1"
      horario       VARCHAR(100) NOT NULL,
      criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Matrículas
    CREATE TABLE IF NOT EXISTS matriculas (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      aluno_id      UUID         NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      turma_id      UUID         NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
      data          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      status        VARCHAR(20)  NOT NULL DEFAULT 'ativa'
                      CHECK (status IN ('ativa', 'trancada', 'concluida')),
      UNIQUE (aluno_id, turma_id)
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_turmas_disciplina  ON turmas(disciplina_id);
    CREATE INDEX IF NOT EXISTS idx_turmas_professor   ON turmas(professor_id);
    CREATE INDEX IF NOT EXISTS idx_matriculas_aluno   ON matriculas(aluno_id);
    CREATE INDEX IF NOT EXISTS idx_matriculas_turma   ON matriculas(turma_id);
  `);
}

module.exports = { createTables };