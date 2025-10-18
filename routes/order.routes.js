const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders with filters
 * @access  Private (Staff with view_orders permission)
 */
router.get('/', checkPermissionNew('view_orders'), orderController.getAllOrders);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get customer's own orders
 * @access  Private (Customer)
 */
router.get('/my-orders', orderController.getMyOrders);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', orderController.getOrderById);

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', orderController.createOrder);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order
 * @access  Private (Staff with update permission)
 */
router.put('/:id', orderController.updateOrder);

/**
 * @route   PUT /api/v1/orders/:id/position
 * @desc    Update order position/status
 * @access  Private (Staff)
 */
router.put('/:id/position', isStaff, orderController.updateOrderPosition);

/**
 * @route   DELETE /api/v1/orders/:id
 * @desc    Delete order
 * @access  Private (Staff with delete permission)
 */
router.delete('/:id', isStaff, checkPermissionNew('delete_orders'), orderController.deleteOrder);

/**
 * @route   GET /api/v1/orders/:id/history
 * @desc    Get order status history
 * @access  Private
 */
router.get('/:id/history', orderController.getOrderHistory);

module.exports = router;


