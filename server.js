const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Import database connection
const db = require('./config/database');

// Import middlewares
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const cartRoutes = require('./routes/cart.routes');
const boxRoutes = require('./routes/box.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const addressRoutes = require('./routes/address.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditRoutes = require('./routes/audit.routes');

// Initialize Express app
const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
app.use(rateLimiter);

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Nazik API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/boxes', boxRoutes);
app.use('/api/v1/shipments', shipmentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║        🚀 Nazik API Server is Running                    ║
  ║                                                           ║
  ║        Port: ${PORT}                                      ║
  ║        Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║        Time: ${new Date().toLocaleString('ar-LY')}         ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.end();
    process.exit(0);
  });
});

module.exports = app;


