const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/shipments
 * @desc    Get all shipments
 * @access  Private (Staff)
 */
router.get('/', shipmentController.getAllShipments);

/**
 * @route   GET /api/v1/shipments/:id
 * @desc    Get shipment by ID
 * @access  Private (Staff)
 */
router.get('/:id', shipmentController.getShipmentById);

/**
 * @route   POST /api/v1/shipments
 * @desc    Create new shipment
 * @access  Private (Staff)
 */
router.post('/', shipmentController.createShipment);

/**
 * @route   PUT /api/v1/shipments/:id/status
 * @desc    Update shipment status
 * @access  Private (Staff)
 */
router.put('/:id/status', shipmentController.updateShipmentStatus);

module.exports = router;


