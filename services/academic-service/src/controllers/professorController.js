'use strict';
const Professor = require('../models/Professor');
const logger = require('../utils/logger');

async function listAll(req, res) {
  try {
    const professores = await Professor.findAll();
    return res.status(200).json({ success: true, data: professores });
  } catch (err) {
    logger.error('professorController.listAll error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function getById(req, res) {
  try {
    const professor = await Professor.findById(req.params.id);
    if (!professor) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado' });
    }
    return res.status(200).json({ success: true, data: professor });
  } catch (err) {
    logger.error('professorController.getById error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function create(req, res) {
  try {
    const { usuarioId, siape, departamento } = req.body;
    if (!usuarioId || !siape || !departamento) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios ausentes: usuarioId, siape, departamento',
      });
    }
    const professor = await Professor.create({ usuarioId, siape, departamento });
    return res.status(201).json({ success: true, data: professor });
  } catch (err) {
    if (err.code === '23505') { // unique_violation do Postgres
      return res.status(409).json({ success: false, message: 'Professor já cadastrado (usuarioId ou siape duplicado)' });
    }
    logger.error('professorController.create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function update(req, res) {
  try {
    const professor = await Professor.update(req.params.id, req.body);
    if (!professor) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado' });
    }
    return res.status(200).json({ success: true, data: professor });
  } catch (err) {
    logger.error('professorController.update error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function remove(req, res) {
  try {
    const deleted = await Professor.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado' });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('professorController.remove error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { listAll, getById, create, update, remove };
