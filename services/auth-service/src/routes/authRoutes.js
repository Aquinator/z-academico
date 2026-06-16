const { Router } = require('express');
const { register, login, me, validate } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/validate', validate); // Chamado internamente pelos outros serviços

// Rotas protegidas
router.get('/me', authenticate, me);

module.exports = router;
