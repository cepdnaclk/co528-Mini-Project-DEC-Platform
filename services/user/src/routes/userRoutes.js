const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../middlewares/validate');
const internalAuth = require('../middlewares/internalAuth');

router.use(internalAuth);

router.get('/me', userController.getMe);
router.put('/me', validate(userController.updateMeSchema), userController.updateMe);

router.get('/', userController.getUsers);

router.get('/:id', userController.getUser);
router.put('/:id/role', validate(userController.updateRoleSchema), userController.updateRole);

module.exports = router;
