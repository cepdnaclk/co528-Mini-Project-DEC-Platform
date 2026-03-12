const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// All regular REST routes require authentication from the gateway
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
