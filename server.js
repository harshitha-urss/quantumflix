const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initDb, getPool } = require('./db');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5000',
    credentials: false,
  })
);
app.use(express.json());

// Static frontend (signup, login, landing)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'signup.html'));
});

// Email verification route
app.get('/verify', async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Invalid verification link.');
  }

  try {
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE verificationToken = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send('Invalid or expired verification link.');
    }

    const userId = rows[0].id;

    await pool.execute(
      'UPDATE users SET isVerified = 1, verificationToken = NULL WHERE id = ?',
      [userId]
    );

    return res.redirect('/login.html');
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).send('Internal server error.');
  }
});

// Auth and movie routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);

// Port configuration
const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    console.log('Database initialized.');
  })
  .catch((err) => {
    console.error('Failed to initialize database (server will still start):', err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

