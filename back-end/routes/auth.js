const express = require('express');
const router = express.Router();
const loginController = require('../controllers/login');

// API Routes
router.post('/register', loginController.registerUser);
router.post('/login', loginController.loginUser);

module.exports = router;
