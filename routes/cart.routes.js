const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/carts
 * @desc    Get all carts
 * @access  Private (Staff)
 */
router.get('/', cartController.getAllCarts);

/**
 * @route   GET /api/v1/carts/:id
 * @desc    Get cart by ID with orders
 * @access  Private (Staff)
 */
router.get('/:id', cartController.getCartById);

/**
 * @route   POST /api/v1/carts
 * @desc    Create new cart
 * @access  Private (Staff)
 */
router.post('/', cartController.createCart);

/**
 * @route   PUT /api/v1/carts/:id/availability
 * @desc    Update cart availability
 * @access  Private (Staff)
 */
router.put('/:id/availability', cartController.updateCartAvailability);

/**
 * @route   GET /api/v1/carts/:id/orders
 * @desc    Get orders in a specific cart with full details
 * @access  Private (Staff)
 */
router.get('/:id/orders', cartController.getCartOrders);

/**
 * @route   POST /api/v1/carts/orders/:orderId/confirm-purchase
 * @desc    Confirm purchase for an order
 * @access  Private (Staff)
 */
router.post('/orders/:orderId/confirm-purchase', cartController.confirmOrderPurchase);

/**
 * @route   GET /api/v1/carts/payment-cards
 * @desc    Get all payment cards
 * @access  Private (Staff)
 */
router.get('/payment-cards', cartController.getPaymentCards);

/**
 * @route   GET /api/v1/carts/treasury/balance
 * @desc    Get treasury balance
 * @access  Private (Staff)
 */
router.get('/treasury/balance', cartController.getTreasuryBalance);

module.exports = router;


