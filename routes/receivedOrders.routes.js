const express = require('express');
const router = express.Router();
const {
  getAllReceivedOrders,
  getReceivedOrderById,
} = require('../controllers/receivedOrders.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes
router.get('/', hasPermission('view_received_orders'), getAllReceivedOrders);
router.get('/:id', hasPermission('view_received_orders'), getReceivedOrderById);

module.exports = router;
