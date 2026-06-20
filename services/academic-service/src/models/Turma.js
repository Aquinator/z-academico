const { query } = require('../utils/database');

async function findAll() {
  const res = await query(`
    SELECT
      t.id, t.semestre, t.horario, t.criado_em,
      d.id AS disciplina_id, d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
      p.id AS professor_id, p.siape AS professor_siape
    FROM turmas t
    JOIN disciplinas d ON d.id = t.disciplina_id
    JOIN professores p ON p.id = t.professor_id
    ORDER BY t.semestre DESC
  `);
  return res.rows;
}

async function findById(id) {
  const res = await query(`
    SELECT
      t.id, t.semestre, t.horario, t.criado_em,
      d.id AS disciplina_id, d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
      p.id AS professor_id, p.siape AS professor_siape
    FROM turmas t
    JOIN disciplinas d ON d.id = t.disciplina_id
    JOIN professores p ON p.id = t.professor_id
    WHERE t.id = $1
  `, [id]);
  return res.rows[0] || null;
}

async function create({ disciplinaId, professorId, semestre, horario }) {
  const res = await query(
    `INSERT INTO turmas (disciplina_id, professor_id, semestre, horario)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [disciplinaId, professorId, semestre, horario]
  );
  return res.rows[0];
}

async function remove(id) {
  const res = await query('DELETE FROM turmas WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
}

module.exports = { findAll, findById, create, remove };