const express = require('express');
const router = express.Router();
const {
  getAllShipments,
  getShipmentById,
  createShipment,
  sendShipment,
  deliverShipment,
  getDeliveredShipments,
  openBox,
  getBoxOrders,
  getClosedBoxes,
  getShippingCompanies,
} = require('../controllers/shipments.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes
router.get('/', hasPermission('view_shipments'), getAllShipments);
router.get('/delivered', hasPermission('view_shipments'), getDeliveredShipments);
router.get('/closed-boxes', hasPermission('view_shipments'), getClosedBoxes);
router.get('/companies', hasPermission('view_shipments'), getShippingCompanies);
router.get('/:id', hasPermission('view_shipments'), getShipmentById);
router.post('/', hasPermission('create_shipments'), createShipment);
router.put('/:id/send', hasPermission('update_shipments'), sendShipment);
router.put('/:id/deliver', hasPermission('update_shipments'), deliverShipment);
router.put('/:id/open-box', hasPermission('update_shipments'), openBox);
router.get('/:id/box-orders', hasPermission('view_shipments'), getBoxOrders);

module.exports = router;
