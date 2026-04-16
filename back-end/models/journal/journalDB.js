const db = require('../../config/db');

// Create journals table if it doesn't exist
const createJournalTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS journals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, entry_date)
    );
  `;
  try {
    await db.query(queryText);
    console.log('Journal table created successfully');
  } catch (error) {
    console.error('Error creating journal table:', error);
    throw error;
  }
};

// Get a journal entry by user and date
const getJournalByDate = async (userId, entryDate) => {
  const queryText = `SELECT * FROM journals WHERE user_id = $1 AND entry_date = $2;`;
  try {
    const { rows } = await db.query(queryText, [userId, entryDate]);
    return rows[0];
  } catch (error) {
    console.error('Error getting journal by date:', error);
    throw error;
  }
};

// Insert or update a journal entry for a specific date
const upsertJournal = async (userId, entryDate, content) => {
  const queryText = `
    INSERT INTO journals (user_id, entry_date, content, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, entry_date)
    DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
    RETURNING *;
  `;
  try {
    const { rows } = await db.query(queryText, [userId, entryDate, content]);
    return rows[0];
  } catch (error) {
    console.error('Error upserting journal:', error);
    throw error;
  }
};

module.exports = {
  createJournalTable,
  getJournalByDate,
  upsertJournal
};
