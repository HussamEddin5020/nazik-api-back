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
 * @access  Private (view_orders permission for staff, own orders for customers)
 */
router.get('/:id', checkPermissionNew('view_orders'), orderController.getOrderById);

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Private (create_orders permission)
 */
router.post('/', checkPermissionNew('create_orders'), orderController.createOrder);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order
 * @access  Private (update_orders permission)
 */
router.put('/:id', checkPermissionNew('update_orders'), orderController.updateOrder);

/**
 * @route   PUT /api/v1/orders/:id/position
 * @desc    Update order position/status
 * @access  Private (update_order_status permission)
 */
router.put('/:id/position', isStaff, checkPermissionNew('update_order_status'), orderController.updateOrderPosition);

/**
 * @route   DELETE /api/v1/orders/:id
 * @desc    Delete order
 * @access  Private (delete_orders permission)
 */
router.delete('/:id', isStaff, checkPermissionNew('delete_orders'), orderController.deleteOrder);

/**
 * @route   GET /api/v1/orders/:id/history
 * @desc    Get order status history
 * @access  Private (view_orders permission)
 */
router.get('/:id/history', checkPermissionNew('view_orders'), orderController.getOrderHistory);

module.exports = router;


