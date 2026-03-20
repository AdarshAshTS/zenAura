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

module.exports = {
  createUserTable,
  addUser,
  getUserById,
  modifyUser,
  deleteUser,
  getUserByEmailOrUsername,
  getUserByEmail
};
