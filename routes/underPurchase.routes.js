const express = require('express');
const router = express.Router();
const {
  getUnderPurchaseOrders,
  getOrderDetails,
  getAvailableCarts,
  addOrderToCart,
  getBrands,
  removeOrderFromCart
} = require('../controllers/underPurchase.controller');

const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');

// All routes require authentication and staff role
router.use(verifyToken, isStaff);

/**
 * @swagger
 * /api/v1/under-purchase/orders:
 *   get:
 *     summary: Get all orders under purchase (position_id = 2)
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, customer name, order id, barcode
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *         description: Filter by brand ID
 *     responses:
 *       200:
 *         description: List of orders under purchase
 *       403:
 *         description: Insufficient permissions
 */
router.get('/orders', checkPermission('view'), getUnderPurchaseOrders);

/**
 * @swagger
 * /api/v1/under-purchase/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', checkPermission('view'), getOrderDetails);

/**
 * @swagger
 * /api/v1/under-purchase/carts:
 *   get:
 *     summary: Get all available carts
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of carts
 */
router.get('/carts', checkPermission('view'), getAvailableCarts);

/**
 * @swagger
 * /api/v1/under-purchase/brands:
 *   get:
 *     summary: Get all brands for filter
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of brands
 */
router.get('/brands', checkPermission('view'), getBrands);

/**
 * @swagger
 * /api/v1/under-purchase/orders/{id}/add-to-cart:
 *   post:
 *     summary: Add order to cart
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cart_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Order added to cart successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Order or cart not found
 */
router.post('/orders/:id/add-to-cart', checkPermission('add'), addOrderToCart);

/**
 * @swagger
 * /api/v1/under-purchase/orders/{id}/remove-from-cart:
 *   delete:
 *     summary: Remove order from cart
 *     tags: [Under Purchase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order removed from cart successfully
 *       400:
 *         description: Order not in cart
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Order not found
 */
router.delete('/orders/:id/remove-from-cart', checkPermission('delete'), removeOrderFromCart);

module.exports = router;

