const db = require('../../config/db');

// Create messages table if it doesn't exist
const createMessagesTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;
  `;
  try {
    await db.query(queryText);
    console.log('Messages table created/updated successfully');
  } catch (error) {
    console.error('Error creating messages table:', error);
    throw error;
  }
};

// Save a new message
const saveMessage = async (senderId, receiverId, message) => {
  const queryText = `
    INSERT INTO messages (sender_id, receiver_id, message)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  try {
    const { rows } = await db.query(queryText, [senderId, receiverId, message]);
    return rows[0];
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Mark messages as read
const markMessagesAsRead = async (senderId, receiverId) => {
  const queryText = `
    UPDATE messages
    SET is_read = TRUE
    WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE;
  `;
  try {
    await db.query(queryText, [senderId, receiverId]);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get chat history with cursor-based pagination
const getChatHistory = async (user1Id, user2Id, limit = 30, beforeId = null) => {
  let queryText;
  let params;

  if (beforeId) {
    queryText = `
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ((sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1))
        AND m.id < $3
      ORDER BY m.timestamp DESC
      LIMIT $4;
    `;
    params = [user1Id, user2Id, beforeId, limit];
  } else {
    queryText = `
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY m.timestamp DESC
      LIMIT $3;
    `;
    params = [user1Id, user2Id, limit];
  }

  try {
    const { rows } = await db.query(queryText, params);
    // Return in ascending order for the client to render top-to-bottom
    return rows.reverse();
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

module.exports = {
  createMessagesTable,
  saveMessage,
  getChatHistory,
  markMessagesAsRead
};
