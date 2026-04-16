const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journal');

// GET /api/journal/:date
router.get('/:date', journalController.getJournal);

// POST /api/journal
router.post('/', journalController.saveJournal);

module.exports = router;
