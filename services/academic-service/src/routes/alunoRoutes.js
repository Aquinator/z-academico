'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/alunoController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticate);

router.get('/',       ctrl.listAll);
router.get('/:id',    ctrl.getById);
router.post('/',      authorize('admin', 'professor'), ctrl.create);
router.put('/:id',    authorize('admin', 'professor'), ctrl.update);
router.delete('/:id', authorize('admin'),              ctrl.remove);

module.exports = router;