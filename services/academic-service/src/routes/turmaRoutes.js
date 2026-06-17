'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/turmaController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.get('/',                   authenticate,                            ctrl.listAll);
router.get('/:id',                authenticate,                            ctrl.getById);
router.post('/',                  authenticate, authorize('admin', 'professor'), ctrl.create);
router.delete('/:id',             authenticate, authorize('admin'),        ctrl.remove);
router.post('/:id/matriculas',    authenticate,                            ctrl.enrollStudent);
router.get('/:id/matriculas',     authenticate,                            ctrl.listMatriculas);

module.exports = router;