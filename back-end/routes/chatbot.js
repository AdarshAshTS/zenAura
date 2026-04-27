const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot');
// To require authentication later, you could add auth middleware
// const { authenticateToken } = require('./auth');

router.post('/message', chatbotController.sendMessage);

module.exports = router;
