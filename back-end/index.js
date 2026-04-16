require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const usersDB = require('./models/user/usersDB');
const quoraDB = require('./models/quora/quoraDB');
const chatDB = require('./models/chat/chatDB');
const journalDB = require('./models/journal/journalDB');
const authRoutes = require('./routes/auth');
const quoraRoutes = require('./routes/quora');
const chatRoutes = require('./routes/chat');
const journalRoutes = require('./routes/journal');
const { AppError } = require('./errors/errorCodes');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Tables
usersDB.createUserTable().catch(console.error);
quoraDB.createTables().catch(console.error);
chatDB.createMessagesTable().catch(console.error);
journalDB.createJournalTable().catch(console.error);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quora', quoraRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journal', journalRoutes);

// Socket.io logic
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  socket.on('send_message', async (data) => {
    // data: { senderId, receiverId, message, senderName, tempId? }
    try {
      const savedMessage = await chatDB.saveMessage(data.senderId, data.receiverId, data.message);
      const messageToEmit = {
        id: savedMessage.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        senderName: data.senderName,
        message: data.message,
        timestamp: savedMessage.timestamp,
        is_read: savedMessage.is_read,
        tempId: data.tempId  // echo back so sender can reconcile optimistic message
      };

      // Send to receiver
      const receiverSocketId = connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', messageToEmit);
      }

      // Echo back to sender (confirms the optimistic message)
      const senderSocketId = connectedUsers.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('receive_message', messageToEmit);
      }
    } catch (error) {
      console.error('Error saving or sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
