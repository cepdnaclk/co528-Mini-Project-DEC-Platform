const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messagingController');

router.post('/send', ctrl.sendMessage);
router.get('/inbox', ctrl.getInbox);
router.get('/unread-count', ctrl.getUnreadCount);
router.get('/conversation/:otherUserId', ctrl.getConversation);
router.put('/:id/read', ctrl.markMessageRead);
router.delete('/:id', ctrl.deleteMessage);

module.exports = router;
