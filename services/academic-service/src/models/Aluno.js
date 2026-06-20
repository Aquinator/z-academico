const { query } = require('../utils/database');

async function findAll() {
  const res = await query(
    'SELECT id, usuario_id, matricula, curso, criado_em FROM alunos ORDER BY criado_em DESC'
  );
  return res.rows;
}

async function findById(id) {
  const res = await query(
    'SELECT id, usuario_id, matricula, curso, criado_em FROM alunos WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

async function findByUsuarioId(usuarioId) {
  const res = await query(
    'SELECT id, usuario_id, matricula, curso, criado_em FROM alunos WHERE usuario_id = $1',
    [usuarioId]
  );
  return res.rows[0] || null;
}

async function create({ usuarioId, matricula, curso }) {
  const res = await query(
    `INSERT INTO alunos (usuario_id, matricula, curso)
     VALUES ($1, $2, $3)
     RETURNING id, usuario_id, matricula, curso, criado_em`,
    [usuarioId, matricula, curso]
  );
  return res.rows[0];
}

async function update(id, { matricula, curso }) {
  const res = await query(
    `UPDATE alunos SET
       matricula = COALESCE($1, matricula),
       curso     = COALESCE($2, curso)
     WHERE id = $3
     RETURNING id, usuario_id, matricula, curso, criado_em`,
    [matricula, curso, id]
  );
  return res.rows[0] || null;
}

async function remove(id) {
  const res = await query('DELETE FROM alunos WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
}

module.exports = { findAll, findById, findByUsuarioId, create, update, remove };