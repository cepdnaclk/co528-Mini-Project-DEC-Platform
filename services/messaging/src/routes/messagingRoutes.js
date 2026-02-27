const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messagingController');

router.post('/send', ctrl.sendMessage);
router.get('/inbox', ctrl.getInbox);
router.get('/conversation/:otherUserId', ctrl.getConversation);

module.exports = router;
