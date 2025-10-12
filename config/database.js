const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// SSL Configuration (if certificates exist)
let sslConfig = null;
const caPath = path.join(__dirname, '../certs/ca.pem');

if (fs.existsSync(caPath)) {
  sslConfig = {
    ca: fs.readFileSync(caPath)
  };
  console.log('🔐 SSL certificates loaded');
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  ...(sslConfig && { ssl: sslConfig })
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    connection.release();
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection lost. Reconnecting...');
  }
});

module.exports = pool;


