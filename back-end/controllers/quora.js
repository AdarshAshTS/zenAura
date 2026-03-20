const quoraDB = require('../models/quora/quoraDB');
const { AppError, ErrorCodes } = require('../errors/errorCodes');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// Helper: extract user info from Bearer token
const getUserFromToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
};

// GET /api/quora/questions?limit=50&offset=0
const getQuestions = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 50);
    const offset = parseInt(req.query.offset) || 0;
    const questions = await quoraDB.getQuestions(limit, offset);
    res.status(200).json({ questions, hasMore: questions.length === limit });
  } catch (error) {
    next(error);
  }
};

// GET /api/quora/questions/search?q=keyword&limit=50&offset=0
const searchQuestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({ questions: [], hasMore: false });
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 50);
    const offset = parseInt(req.query.offset) || 0;
    const questions = await quoraDB.searchQuestions(q.trim(), limit, offset);
    res.status(200).json({ questions, hasMore: questions.length === limit });
  } catch (error) {
    next(error);
  }
};

// POST /api/quora/questions
const postQuestion = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const { question } = req.body;
    if (!question || question.trim() === '') {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Question text is required');
    }
    const username = user.username || user.userName || 'Anonymous';
    const newQuestion = await quoraDB.addQuestion(question.trim(), user.id, username);
    res.status(201).json({ question: { ...newQuestion, answer_count: 0 } });
  } catch (error) {
    next(error);
  }
};

// GET /api/quora/questions/:id/answers
const getAnswersForQuestion = async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.id);
    const answers = await quoraDB.getAnswersByQuestion(questionId);
    res.status(200).json({ answers });
  } catch (error) {
    next(error);
  }
};

// POST /api/quora/questions/:id/answers
const postAnswer = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const questionId = parseInt(req.params.id);
    const { answer } = req.body;
    if (!answer || answer.trim() === '') {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Answer text is required');
    }
    // Verify question exists
    const question = await quoraDB.getQuestionById(questionId);
    if (!question) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Question not found');
    }
    const username = user.username || user.userName || 'Anonymous';
    const newAnswer = await quoraDB.addAnswer(answer.trim(), user.id, username, questionId);
    res.status(201).json({ answer: newAnswer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  searchQuestions,
  postQuestion,
  getAnswersForQuestion,
  postAnswer
};
