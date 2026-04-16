const usersDB = require('../models/user/usersDB');
const chatDB = require('../models/chat/chatDB');
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

// GET /api/chat/users
const getChatUsers = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const users = await usersDB.getChatUsersWithLatestMessage(user.id);
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/history/:receiverId
const getHistory = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const receiverId = parseInt(req.params.receiverId);
    const limit = parseInt(req.query.limit) || 30;
    const beforeId = req.query.before_id ? parseInt(req.query.before_id) : null;
    const history = await chatDB.getChatHistory(user.id, receiverId, limit, beforeId);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
};

// PUT /api/chat/read/:senderId
const markAsRead = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const senderId = parseInt(req.params.senderId);
    await chatDB.markMessagesAsRead(senderId, user.id);
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatUsers,
  getHistory,
  markAsRead
};
