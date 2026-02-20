const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;

function getPool() {
  if (pool) return pool;

  const isProduction = process.env.NODE_ENV === 'production';

  let sslOptions;
  if (isProduction) {
    try {
      const sslCaPath = process.env.DB_SSL_CA_PATH || path.join(__dirname, 'ca.pem');
      sslOptions = {
        ca: fs.readFileSync(sslCaPath),
      };
      console.log('MySQL SSL enabled for production using CA at:', sslCaPath);
    } catch (err) {
      console.error('Failed to read SSL CA file for MySQL:', err);
    }
  }

  const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (sslOptions) {
    poolConfig.ssl = sslOptions;
  }

  pool = mysql.createPool(poolConfig);
  console.log('MySQL pool created. Env:', process.env.NODE_ENV || 'development');

  return pool;
}

async function initDb() {
  const pool = getPool();

  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      userId VARCHAR(50) NOT NULL UNIQUE,
      fullName VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL,
      password VARCHAR(255) NOT NULL,
      isVerified BOOLEAN DEFAULT FALSE,
      verificationToken VARCHAR(255),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await pool.query(createUsersTableQuery);
  console.log('Verified that users table exists.');
}

module.exports = {
  getPool,
  initDb,
};

