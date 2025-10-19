const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/helpers');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/dashboard/statistics
 * @access  Private (Staff)
 */
exports.getStatistics = asyncHandler(async (req, res) => {
  try {
    console.log('📊 Dashboard Statistics Request - User:', req.user?.id);
    
    // Total orders
    const [totalOrders] = await db.query(
      'SELECT COUNT(*) as total FROM orders WHERE is_archived = 0'
    );

    // Total customers
    const [totalCustomers] = await db.query(
      'SELECT COUNT(*) as total FROM customers'
    );

    // Orders by position
    const [ordersByPosition] = await db.query(
      `SELECT op.name, COUNT(o.id) as count
       FROM orders o
       JOIN order_position op ON o.position_id = op.id
       WHERE 1=1
       GROUP BY o.position_id, op.name
       ORDER BY count DESC`
    );

    // Active carts
    const [activeCarts] = await db.query(
      'SELECT COUNT(*) as total FROM cart WHERE is_available = 1'
    );

    // Total invoices
    const [totalInvoices] = await db.query(
      'SELECT COUNT(*) as total, SUM(total_amount) as total_amount FROM order_invoices'
    );

    // Recent activity
    const [recentActivity] = await db.query(
      `SELECT actor_name, action_type, table_name, description, created_at
       FROM v_audit_log_detailed
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const statistics = {
      totalOrders: totalOrders[0].total,
      totalCustomers: totalCustomers[0].total,
      ordersByPosition,
      activeCarts: activeCarts[0].total,
      totalInvoices: totalInvoices[0].total,
      totalRevenue: totalInvoices[0].total_amount || 0,
      recentActivity
    };

    console.log('✅ Dashboard Statistics Response:', statistics);
    successResponse(res, statistics);
  } catch (error) {
    console.error('❌ Dashboard Statistics Error:', error);
    throw error;
  }
});

/**
 * @desc    Get recent orders
 * @route   GET /api/v1/dashboard/recent-orders
 * @access  Private (Staff)
 */
exports.getRecentOrders = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const [orders] = await db.query(
    `SELECT o.id, o.created_at, o.position_id,
            op.name as position_name,
            u.name as customer_name,
            od.title
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN order_details od ON o.id = od.order_id
     WHERE 1=1
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [parseInt(limit)]
  );

  successResponse(res, orders);
});

/**
 * @desc    Get financial summary
 * @route   GET /api/v1/dashboard/financial-summary
 * @access  Private (Staff)
 */
exports.getFinancialSummary = asyncHandler(async (req, res) => {
  // Total invoices by payment method
  const [paymentMethods] = await db.query(
    `SELECT payment_method, 
            COUNT(*) as count,
            SUM(total_amount) as total,
            SUM(cash_amount) as total_cash,
            SUM(card_paid_amount) as total_card
     FROM order_invoices
     GROUP BY payment_method`
  );

  // Total discounts
  const [discounts] = await db.query(
    'SELECT SUM(discount_amount) as total_discounts FROM order_invoices'
  );

  // Total expenses
  const [expenses] = await db.query(
    'SELECT SUM(expenses_amount) as total_expenses FROM order_invoices'
  );

  const summary = {
    byPaymentMethod: paymentMethods,
    totalDiscounts: discounts[0].total_discounts || 0,
    totalExpenses: expenses[0].total_expenses || 0
  };

  successResponse(res, summary);
});

module.exports = exports;


