const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Registration
router.post('/register', authLimiter, (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanDisplayName = String(display_name || username).trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check existing user
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'Username or email is already registered.' });
  }

  // Assign a distinct vibrant avatar color
  const palette = ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  const avatar_color = palette[Math.floor(Math.random() * palette.length)];

  const password_hash = bcrypt.hashSync(password, 10);

  const insert = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, display_name, avatar_color)
    VALUES (?, ?, ?, 'user', ?, ?)
  `);

  try {
    const info = insert.run(cleanUsername, cleanEmail, password_hash, cleanDisplayName, avatar_color);
    const userId = info.lastInsertRowid;

    const token = jwt.sign({ id: userId, username: cleanUsername, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        role: 'user',
        display_name: cleanDisplayName,
        avatar_color
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Login
router.post('/login', authLimiter, (req, res) => {
  const { identifier, password } = req.body; // username or email

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier (username or email) and password are required.' });
  }

  const cleanIdentifier = String(identifier).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
      avatar_color: user.avatar_color
    }
  });
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Get list of demo users for quick frictionless testing
router.get('/demo-accounts', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, display_name, avatar_color 
    FROM users 
    WHERE username IN ('admin', 'abc', 'runner_dan', 'sarah_cyclist', 'walker_sam')
    ORDER BY role DESC, id ASC
  `).all();
  res.json({ demoAccounts: users });
});

module.exports = router;
