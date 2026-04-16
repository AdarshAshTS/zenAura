const journalDB = require('../models/journal/journalDB');
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

// GET /api/journal/:date
const getJournal = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const date = req.params.date; // expected format: YYYY-MM-DD
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const journal = await journalDB.getJournalByDate(user.id, date);
    res.status(200).json({ journal: journal || null });
  } catch (error) {
    next(error);
  }
};

// POST /api/journal
const saveJournal = async (req, res, next) => {
  try {
    const user = getUserFromToken(req);
    const { date, content } = req.body;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Server-side check: Ensure users only save journals for the current date or past?
    // Wait, requirement: "older journals won't be able to edit."
    
    const today = new Date();
    // Get local date string in YYYY-MM-DD safely
    const offset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

    if (date > localTodayStr) {
        return res.status(403).json({ error: 'Cannot save journal for future dates.' });
    }
    
    if (date < localTodayStr) {
        return res.status(403).json({ error: 'Cannot edit past journals.' });
    }

    const savedJournal = await journalDB.upsertJournal(user.id, date, content);
    res.status(200).json({ journal: savedJournal });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJournal,
  saveJournal
};
