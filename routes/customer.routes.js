const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers
 * @access  Private (Staff with view_orders permission)
 */
router.get('/', isStaff, hasPermission('view_orders'), customerController.getAllCustomers);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', customerController.getCustomerById);

/**
 * @route   PUT /api/v1/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', customerController.updateCustomer);

/**
 * @route   PUT /api/v1/customers/:id/address
 * @desc    Update customer address
 * @access  Private
 */
router.put('/:id/address', customerController.updateCustomerAddress);

/**
 * @route   GET /api/v1/customers/:id/orders
 * @desc    Get customer orders
 * @access  Private
 */
router.get('/:id/orders', customerController.getCustomerOrders);

module.exports = router;


