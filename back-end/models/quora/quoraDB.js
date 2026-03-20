const db = require('../../config/db');

// Create quora and answers tables if they don't exist
const createTables = async () => {
  const quoraTable = `
    CREATE TABLE IF NOT EXISTS quora (
      id         SERIAL PRIMARY KEY,
      question   TEXT NOT NULL,
      user_id    INTEGER NOT NULL,
      user_name  VARCHAR(100) NOT NULL,
      timestamp  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const answersTable = `
    CREATE TABLE IF NOT EXISTS answers (
      id          SERIAL PRIMARY KEY,
      answer      TEXT NOT NULL,
      user_id     INTEGER NOT NULL,
      user_name   VARCHAR(100) NOT NULL,
      timestamp   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      question_id INTEGER NOT NULL REFERENCES quora(id) ON DELETE CASCADE
    );
  `;

  // Index for fast full-text keyword search on question column
  const searchIndex = `
    CREATE INDEX IF NOT EXISTS idx_quora_question_search
    ON quora USING gin(to_tsvector('english', question));
  `;

  try {
    await db.query(quoraTable);
    await db.query(answersTable);
    await db.query(searchIndex);
    console.log('Quora and Answers tables created successfully');
  } catch (error) {
    console.error('Error creating Quora/Answers tables:', error);
    throw error;
  }
};

// Add a new question
const addQuestion = async (question, userId, userName) => {
  const queryText = `
    INSERT INTO quora (question, user_id, user_name)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await db.query(queryText, [question, userId, userName]);
  return rows[0];
};

// Add an answer to a question
const addAnswer = async (answer, userId, userName, questionId) => {
  const queryText = `
    INSERT INTO answers (answer, user_id, user_name, question_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await db.query(queryText, [answer, userId, userName, questionId]);
  return rows[0];
};

// Get paginated questions (most recent first), with answer count
const getQuestions = async (limit = 50, offset = 0) => {
  const queryText = `
    SELECT q.*,
           COUNT(a.id)::int AS answer_count
    FROM quora q
    LEFT JOIN answers a ON a.question_id = q.id
    GROUP BY q.id
    ORDER BY q.timestamp DESC
    LIMIT $1 OFFSET $2;
  `;
  const { rows } = await db.query(queryText, [limit, offset]);
  return rows;
};

// Full-text search across all questions, paginated
const searchQuestions = async (keyword, limit = 50, offset = 0) => {
  const queryText = `
    SELECT q.*,
           COUNT(a.id)::int AS answer_count,
           ts_rank(to_tsvector('english', q.question), plainto_tsquery('english', $1)) AS rank
    FROM quora q
    LEFT JOIN answers a ON a.question_id = q.id
    WHERE to_tsvector('english', q.question) @@ plainto_tsquery('english', $1)
       OR q.question ILIKE '%' || $1 || '%'
    GROUP BY q.id
    ORDER BY rank DESC, q.timestamp DESC
    LIMIT $2 OFFSET $3;
  `;
  const { rows } = await db.query(queryText, [keyword, limit, offset]);
  return rows;
};

// Get all answers for a specific question
const getAnswersByQuestion = async (questionId) => {
  const queryText = `
    SELECT * FROM answers
    WHERE question_id = $1
    ORDER BY timestamp ASC;
  `;
  const { rows } = await db.query(queryText, [questionId]);
  return rows;
};

// Get a single question by ID
const getQuestionById = async (id) => {
  const queryText = `SELECT * FROM quora WHERE id = $1;`;
  const { rows } = await db.query(queryText, [id]);
  return rows[0];
};

module.exports = {
  createTables,
  addQuestion,
  addAnswer,
  getQuestions,
  searchQuestions,
  getAnswersByQuestion,
  getQuestionById
};
