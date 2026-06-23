const { query } = require('../utils/database');

async function findAll() {
  const res = await query(
    'SELECT id, usuario_id, siape, departamento, criado_em FROM professores ORDER BY criado_em DESC'
  );
  return res.rows;
}

async function findById(id) {
  const res = await query(
    'SELECT id, usuario_id, siape, departamento, criado_em FROM professores WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

async function findByUsuarioId(usuarioId) {
  const res = await query(
    'SELECT id, usuario_id, siape, departamento, criado_em FROM professores WHERE usuario_id = $1',
    [usuarioId]
  );
  return res.rows[0] || null;
}

async function create({ usuarioId, siape, departamento }) {
  const res = await query(
    `INSERT INTO professores (usuario_id, siape, departamento)
     VALUES ($1, $2, $3)
     RETURNING id, usuario_id, siape, departamento, criado_em`,
    [usuarioId, siape, departamento]
  );
  return res.rows[0];
}

async function update(id, { siape, departamento }) {
  const res = await query(
    `UPDATE professores SET
       siape        = COALESCE($1, siape),
       departamento = COALESCE($2, departamento)
     WHERE id = $3
     RETURNING id, usuario_id, siape, departamento, criado_em`,
    [siape, departamento, id]
  );
  return res.rows[0] || null;
}

async function remove(id) {
  const res = await query('DELETE FROM professores WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
}

module.exports = { findAll, findById, findByUsuarioId, create, update, remove };
