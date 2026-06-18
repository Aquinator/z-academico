const { query } = require('../utils/database');

async function findAll() {
  const res = await query(
    'SELECT * FROM disciplinas ORDER BY nome'
  );
  return res.rows;
}

async function findById(id) {
  const res = await query('SELECT * FROM disciplinas WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function create({ nome, codigo, cargaHoraria }) {
  const res = await query(
    `INSERT INTO disciplinas (nome, codigo, carga_horaria)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nome, codigo, cargaHoraria]
  );
  return res.rows[0];
}

async function update(id, { nome, codigo, cargaHoraria }) {
  const res = await query(
    `UPDATE disciplinas SET
       nome          = COALESCE($1, nome),
       codigo        = COALESCE($2, codigo),
       carga_horaria = COALESCE($3, carga_horaria)
     WHERE id = $4
     RETURNING *`,
    [nome, codigo, cargaHoraria, id]
  );
  return res.rows[0] || null;
}

async function remove(id) {
  const res = await query('DELETE FROM disciplinas WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };