require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const usersDB = require('./models/user/usersDB');
const quoraDB = require('./models/quora/quoraDB');
const authRoutes = require('./routes/auth');
const quoraRoutes = require('./routes/quora');
const { AppError } = require('./errors/errorCodes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Tables
usersDB.createUserTable().catch(console.error);
quoraDB.createTables().catch(console.error);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quora', quoraRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  res.status(status).json({
    error: {
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
