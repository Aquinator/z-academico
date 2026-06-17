'use strict';

const Disciplina = require('../models/Disciplina');
const logger = require('../utils/logger');

async function listAll(req, res) {
  try {
    const disciplinas = await Disciplina.findAll();
    return res.status(200).json({ success: true, data: disciplinas });
  } catch (err) {
    logger.error('disciplinaController.listAll error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function getById(req, res) {
  try {
    const disciplina = await Disciplina.findById(req.params.id);
    if (!disciplina) {
      return res.status(404).json({ success: false, message: 'Disciplina não encontrada' });
    }
    return res.status(200).json({ success: true, data: disciplina });
  } catch (err) {
    logger.error('disciplinaController.getById error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function create(req, res) {
  try {
    const { nome, codigo, cargaHoraria } = req.body;
    if (!nome || !codigo || !cargaHoraria) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes: nome, codigo, cargaHoraria' });
    }
    const disciplina = await Disciplina.create({ nome, codigo, cargaHoraria });
    return res.status(201).json({ success: true, data: disciplina });
  } catch (err) {
    logger.error('disciplinaController.create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function update(req, res) {
  try {
    const disciplina = await Disciplina.update(req.params.id, req.body);
    if (!disciplina) {
      return res.status(404).json({ success: false, message: 'Disciplina não encontrada' });
    }
    return res.status(200).json({ success: true, data: disciplina });
  } catch (err) {
    logger.error('disciplinaController.update error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

async function remove(req, res) {
  try {
    const deleted = await Disciplina.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Disciplina não encontrada' });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('disciplinaController.remove error', { error: err.message, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { listAll, getById, create, update, remove };