const express = require('express');
const router = express.Router();
const quoraController = require('../controllers/quora');

// Questions
router.get('/questions', quoraController.getQuestions);
router.get('/questions/search', quoraController.searchQuestions);
router.post('/questions', quoraController.postQuestion);

// Answers
router.get('/questions/:id/answers', quoraController.getAnswersForQuestion);
router.post('/questions/:id/answers', quoraController.postAnswer);

module.exports = router;
