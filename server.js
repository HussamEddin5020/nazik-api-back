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
// const cartRoutes = require('./routes/cart.routes'); // تم استبداله بـ cartsRoutes
// const boxRoutes = require('./routes/box.routes'); // تم استبداله بـ boxesRoutes
// const shipmentRoutes = require('./routes/shipment.routes'); // تم استبداله بـ shipmentsRoutes
const invoiceRoutes = require('./routes/invoice.routes');
const addressRoutes = require('./routes/address.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditRoutes = require('./routes/audit.routes');
const auditLogsRoutes = require('./routes/auditLogs.routes');
const underPurchaseRoutes = require('./routes/underPurchase.routes');
const testRoutes = require('./routes/test.routes');
const cartsRoutes = require('./routes/carts.routes');
const paymentCardsRoutes = require('./routes/paymentCards.routes');
const treasuryRoutes = require('./routes/treasury.routes');
const orderPurchaseRoutes = require('./routes/orderPurchase.routes');
const boxesRoutes = require('./routes/boxes.routes');
const shipmentsRoutes = require('./routes/shipments.routes');
const rolesRoutes = require('./routes/roles.routes');
const permissionsRoutes = require('./routes/permissions.routes');
const userRolesRoutes = require('./routes/userRoles.routes');
const purchaseInvoiceRoutes = require('./routes/purchaseInvoice.routes');
const collectionsRoutes = require('./routes/collections.routes');
const receivedOrdersRoutes = require('./routes/receivedOrders.routes');
const financialReportsRoutes = require('./routes/financialReports.routes');
const ordersStatisticsRoutes = require('./routes/ordersStatistics.routes');
const productRoutes = require('./routes/product.routes');
const darbAssabilRoutes = require('./routes/darbAssabil.routes');

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
// app.use('/api/v1/carts', cartRoutes); // تم استبداله بـ cartsRoutes
// app.use('/api/v1/boxes', boxRoutes); // تم استبداله بـ boxesRoutes
// app.use('/api/v1/shipments', shipmentRoutes); // تم استبداله بـ shipmentsRoutes
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/audit-logs', auditLogsRoutes);
app.use('/api/v1/under-purchase', underPurchaseRoutes);
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/carts', cartsRoutes);
app.use('/api/v1/payment-cards', paymentCardsRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1/orders', orderPurchaseRoutes);
app.use('/api/v1/boxes', boxesRoutes);
app.use('/api/v1/shipments', shipmentsRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/users-management', userRolesRoutes);
app.use('/api/v1/purchase-invoices', purchaseInvoiceRoutes);
app.use('/api/v1/collections', collectionsRoutes);
app.use('/api/v1/received-orders', receivedOrdersRoutes);
app.use('/api/v1/financial-reports', financialReportsRoutes);
app.use('/api/v1/orders-statistics', ordersStatisticsRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/darb-assabil', darbAssabilRoutes);

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


