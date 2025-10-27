const express = require('express');
const router = express.Router();
const ordersStatisticsController = require('../controllers/ordersStatistics.controller');
const { verifyToken } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/orders-statistics
 * @desc    Get orders statistics with filters
 * @access  Private (Staff with view_orders permission)
 */
router.get('/', checkPermissionNew('view_orders'), ordersStatisticsController.getOrdersStatistics);

/**
 * @route   GET /api/v1/orders-statistics/summary
 * @desc    Get orders statistics summary
 * @access  Private (Staff with view_orders permission)
 */
router.get('/summary', checkPermissionNew('view_orders'), ordersStatisticsController.getStatisticsSummary);

module.exports = router;

