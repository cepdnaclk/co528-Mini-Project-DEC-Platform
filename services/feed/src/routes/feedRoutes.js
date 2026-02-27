const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const validate = require('../middlewares/validate');
const internalAuth = require('../middlewares/internalAuth');

router.get('/posts/popular', internalAuth, feedController.getPopularPosts);

router.post('/posts', validate(feedController.postSchema), feedController.createPost);
router.get('/posts', feedController.getPosts);

router.get('/posts/:id', feedController.getPost);
router.post('/posts/:id/like', feedController.likePost);
router.delete('/posts/:id/like', feedController.unlikePost);

router.post('/posts/:id/comments', validate(feedController.commentSchema), feedController.addComment);
router.get('/posts/:id/comments', feedController.getComments);

router.post('/posts/:id/share', feedController.sharePost);

router.post('/media/upload-url', feedController.getUploadUrl);

module.exports = router;
