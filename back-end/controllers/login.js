const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersDB = require('../models/user/usersDB');
const { AppError, ErrorCodes } = require('../errors/errorCodes');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Username, email, and password are required');
    }

    // Check if user exists
    const existingUser = await usersDB.getUserByEmailOrUsername(username, email);
    if (existingUser) {
      throw new AppError(ErrorCodes.CONFLICT, 'User with this email or username already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in DB
    const newUser = await usersDB.addUser(username, email, hashedPassword);
    
    // Create token
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Email and password are required');
    }

    // Find user by email
    const user = await usersDB.getUserByEmail(email);
    if (!user) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    // Create token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser
};
