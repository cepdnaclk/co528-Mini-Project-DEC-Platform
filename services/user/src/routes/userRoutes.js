const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../middlewares/validate');
const internalAuth = require('../middlewares/internalAuth');

router.use(internalAuth);

router.get('/me', userController.getMe);
router.put('/me', validate(userController.updateMeSchema), userController.updateMe);
router.post('/me/avatar', userController.getAvatarUploadUrl);
router.put('/me/avatar', userController.confirmAvatar);

router.get('/search', userController.searchUsers);
router.get('/', userController.getUsers);

router.get('/:id', userController.getUser);
router.put('/:id/role', validate(userController.updateRoleSchema), userController.updateRole);
router.post('/:id/follow', userController.followUser);
router.delete('/:id/follow', userController.unfollowUser);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

module.exports = router;
