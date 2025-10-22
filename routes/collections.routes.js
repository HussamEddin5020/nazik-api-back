const express = require('express');
const router = express.Router();
const {
  getAllCollections,
  getCollectionById,
  sendOrderToDelivery,
  sendAllCollectionOrders,
} = require('../controllers/collections.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes
router.get('/', hasPermission('view_collections'), getAllCollections);
router.get('/:id', hasPermission('view_collections'), getCollectionById);
router.put('/:id/send-all', hasPermission('send_orders_delivery'), sendAllCollectionOrders);
router.put('/:collectionId/orders/:orderId/send', hasPermission('send_orders_delivery'), sendOrderToDelivery);

module.exports = router;


