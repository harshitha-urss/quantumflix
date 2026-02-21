const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { getPool } = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('EMAIL_USER or EMAIL_PASS is not set. Cannot send verification emails.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

router.post('/signup', async (req, res) => {
  try {
    const { userId, fullName, email, phone, password } = req.body;

    if (!userId || !fullName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR userId = ? LIMIT 1',
      [email, userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'User with this email or userId already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO users (userId, fullName, email, phone, password, isVerified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, fullName, email, phone, hashedPassword, true]
    );

    return res.status(201).json({
      message: 'Signup successful.',
      userId: result.insertId,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id, userId, fullName, email, phone, password, isVerified FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/movies/trending', async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is not configured.' });
    }

    const response = await axios.get('https://api.themoviedb.org/3/trending/movie/week', {
      params: {
        api_key: apiKey,
        language: 'en-US',
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('TMDB fetch error:', error?.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to fetch movies from TMDB.' });
  }
});

module.exports = router;

