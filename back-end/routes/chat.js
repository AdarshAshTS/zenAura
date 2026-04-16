const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');

router.get('/users', chatController.getChatUsers);
router.get('/history/:receiverId', chatController.getHistory);
router.put('/read/:senderId', chatController.markAsRead);

module.exports = router;
