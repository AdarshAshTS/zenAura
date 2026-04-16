const db = require('../../config/db');

// Create user table if it doesn't exist
const createUserTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(queryText);
    console.log('User table created successfully');
  } catch (error) {
    console.error('Error creating user table:', error);
    throw error;
  }
};

// Add a new user (Create)
const addUser = async (username, email, passwordHash) => {
  const queryText = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at;
  `;
  try {
    const { rows } = await db.query(queryText, [username, email, passwordHash]);
    return rows[0];
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

// Get user by ID (Read)
const getUserById = async (id) => {
  const queryText = `SELECT * FROM users WHERE id = $1;`;
  try {
    const { rows } = await db.query(queryText, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Modify/Update a user
const modifyUser = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const setParams = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
  const values = keys.map(key => updates[key]);

  const queryText = `
    UPDATE users
    SET ${setParams}
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await db.query(queryText, [id, ...values]);
    return rows[0];
  } catch (error) {
    console.error('Error modifying user:', error);
    throw error;
  }
};

// Delete a user
const deleteUser = async (id) => {
  const queryText = `
    DELETE FROM users
    WHERE id = $1
    RETURNING *;
  `;
  try {
    const { rows } = await db.query(queryText, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Get user by email or username
const getUserByEmailOrUsername = async (username, email) => {
  const queryText = `SELECT * FROM users WHERE username = $1 OR email = $2;`;
  try {
    const { rows } = await db.query(queryText, [username, email]);
    return rows[0];
  } catch (error) {
    console.error('Error getting user by email or username:', error);
    throw error;
  }
};

// Get user by email
const getUserByEmail = async (email) => {
  const queryText = `SELECT * FROM users WHERE email = $1;`;
  try {
    const { rows } = await db.query(queryText, [email]);
    return rows[0];
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

// Get all users
const getAllUsers = async (excludeId = null) => {
  let queryText = `SELECT id, username, email, created_at FROM users`;
  const params = [];
  if (excludeId) {
    queryText += ` WHERE id != $1`;
    params.push(excludeId);
  }
  queryText += ` ORDER BY username ASC;`;

  try {
    const { rows } = await db.query(queryText, params);
    return rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

// Get users sorted by latest interaction
const getChatUsersWithLatestMessage = async (currentUserId) => {
  const queryText = `
    SELECT 
      u.id, 
      u.username, 
      u.email, 
      MAX(m.timestamp) as last_message_time,
      (SELECT message FROM messages 
       WHERE (sender_id = u.id AND receiver_id = $1) 
          OR (sender_id = $1 AND receiver_id = u.id) 
       ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages 
       WHERE sender_id = u.id AND receiver_id = $1 AND is_read = FALSE) as unread_count
    FROM users u
    LEFT JOIN messages m ON (m.sender_id = $1 AND m.receiver_id = u.id) 
                          OR (m.sender_id = u.id AND m.receiver_id = $1)
    WHERE u.id != $1
    GROUP BY u.id, u.username, u.email
    ORDER BY last_message_time DESC NULLS LAST, u.username ASC;
  `;
  try {
    const { rows } = await db.query(queryText, [currentUserId]);
    return rows;
  } catch (error) {
    console.error('Error getting chat users with latest message:', error);
    throw error;
  }
};

module.exports = {
  createUserTable,
  addUser,
  getUserById,
  modifyUser,
  deleteUser,
  getUserByEmailOrUsername,
  getUserByEmail,
  getAllUsers,
  getChatUsersWithLatestMessage
};
