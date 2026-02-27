const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');

router.post('/register', validate(authController.registerSchema), authController.register);
router.post('/login', validate(authController.loginSchema), authController.login);
router.post('/refresh', validate(authController.refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
