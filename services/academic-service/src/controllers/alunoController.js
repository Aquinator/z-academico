'use strict';

const Aluno = require('../models/Aluno');
const logger = require('../utils/logger');

async function listAll(req, res) {
  try {
    const alunos = await Aluno.findAll();
    return res.status(200).json({ success: true, data: alunos });
  } catch (err) {
    logger.error('alunoController.listAll error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function getById(req, res) {
  try {
    const aluno = await Aluno.findById(req.params.id);
    if (!aluno) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }
    return res.status(200).json({ success: true, data: aluno });
  } catch (err) {
    logger.error('alunoController.getById error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function create(req, res) {
  try {
    const { usuarioId, matricula, curso } = req.body;
    if (!usuarioId || !matricula || !curso) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes: usuarioId, matricula, curso' });
    }
    const aluno = await Aluno.create({ usuarioId, matricula, curso });
    return res.status(201).json({ success: true, data: aluno });
  } catch (err) {
    logger.error('alunoController.create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function update(req, res) {
  try {
    const aluno = await Aluno.update(req.params.id, req.body);
    if (!aluno) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }
    return res.status(200).json({ success: true, data: aluno });
  } catch (err) {
    logger.error('alunoController.update error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function remove(req, res) {
  try {
    const deleted = await Aluno.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('alunoController.remove error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { listAll, getById, create, update, remove };