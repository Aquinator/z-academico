'use strict';

const Turma = require('../models/Turma');
const db = require('../utils/database');
const logger = require('../utils/logger');

async function listAll(req, res) {
  try {
    const turmas = await Turma.findAll();
    return res.status(200).json({ success: true, data: turmas });
  } catch (err) {
    logger.error('turmaController.listAll error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function getById(req, res) {
  try {
    const turma = await Turma.findById(req.params.id);
    if (!turma) {
      return res.status(404).json({ success: false, message: 'Turma não encontrada' });
    }
    return res.status(200).json({ success: true, data: turma });
  } catch (err) {
    logger.error('turmaController.getById error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function create(req, res) {
  try {
    const { disciplinaId, professorId, semestre, horario } = req.body;
    if (!disciplinaId || !professorId || !semestre || !horario) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes: disciplinaId, professorId, semestre, horario' });
    }
    const turma = await Turma.create({ disciplinaId, professorId, semestre, horario });
    return res.status(201).json({ success: true, data: turma });
  } catch (err) {
    logger.error('turmaController.create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function remove(req, res) {
  try {
    const deleted = await Turma.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Turma não encontrada' });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('turmaController.remove error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function enrollStudent(req, res) {
  try {
    const { id: turmaId } = req.params;
    const { alunoId } = req.body;

    if (!alunoId) {
      return res.status(400).json({ success: false, message: 'Campo obrigatório ausente: alunoId' });
    }

    const result = await db.query(
      'INSERT INTO matriculas (turma_id, aluno_id) VALUES ($1, $2) RETURNING *',
      [turmaId, alunoId]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    // Código 23505 = violação de UNIQUE constraint no PostgreSQL
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Aluno já matriculado nesta turma' });
    }
    logger.error('turmaController.enrollStudent error', { error: err.message, turmaId: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function listMatriculas(req, res) {
  try {
    const { id: turmaId } = req.params;

    const result = await db.query(
      `SELECT a.*
         FROM alunos a
         JOIN matriculas m ON m.aluno_id = a.id
        WHERE m.turma_id = $1`,
      [turmaId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('turmaController.listMatriculas error', { error: err.message, turmaId: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { listAll, getById, create, remove, enrollStudent, listMatriculas };