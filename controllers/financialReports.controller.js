const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get financial reports summary
 * @route   GET /api/v1/financial-reports/summary
 * @access  Private (Staff with view_financial_reports permission)
 */
exports.getFinancialSummary = asyncHandler(async (req, res) => {
  // 1. إجمالي الطلبات النقدية
  const [cashOrders] = await db.query(`
    SELECT 
      COUNT(*) as total_cash_orders,
      COALESCE(SUM(cash_amount), 0) as total_cash_amount
    FROM order_invoices
    WHERE payment_method = 'cash' AND cash_amount IS NOT NULL
  `);

  // 2. إجمالي الطلبات بالبطاقة
  const [cardOrders] = await db.query(`
    SELECT 
      COUNT(*) as total_card_orders,
      COALESCE(SUM(card_paid_amount), 0) as total_card_amount
    FROM order_invoices
    WHERE payment_method = 'card' AND card_paid_amount IS NOT NULL
  `);

  // 3. العربونات للطلبات تحت الشراء (position_id = 2)
  const [advanceDeposits] = await db.query(`
    SELECT 
      COUNT(o.id) as total_advance_orders,
      COALESCE(SUM(oi.cash_amount + oi.card_paid_amount), 0) as total_advance_amount
    FROM orders o
    INNER JOIN order_invoices oi ON o.id = oi.order_id
    WHERE o.position_id = 2 AND o.is_active = 1
  `);

  // 4. إجمالي الإيرادات (النقد + البطاقة)
  const [totalRevenue] = await db.query(`
    SELECT 
      COALESCE(SUM(cash_amount), 0) + COALESCE(SUM(card_paid_amount), 0) as total_revenue
    FROM order_invoices
    WHERE payment_method IN ('cash', 'card')
  `);

  // 5. إجمالي الخصومات
  const [totalDiscounts] = await db.query(`
    SELECT 
      COALESCE(SUM(discount_amount), 0) as total_discount
    FROM order_invoices
  `);

  // 6. إجمالي المصاريف
  const [totalExpenses] = await db.query(`
    SELECT 
      COALESCE(SUM(expenses_amount), 0) as total_expense
    FROM order_invoices
  `);

  // 7. إجمالي الطلبات
  const [totalOrders] = await db.query(`
    SELECT COUNT(*) as total_orders
    FROM orders WHERE is_active = 1
  `);

  const summary = {
    cashOrders: cashOrders[0],
    cardOrders: cardOrders[0],
    advanceDeposits: advanceDeposits[0],
    totalRevenue: totalRevenue[0],
    totalDiscounts: totalDiscounts[0],
    totalExpenses: totalExpenses[0],
    totalOrders: totalOrders[0],
    netRevenue: totalRevenue[0].total_revenue - totalDiscounts[0].total_discount + totalExpenses[0].total_expense,
  };

  successResponse(res, summary, 'تم جلب التقارير المالية بنجاح');
});

/**
 * @desc    Get payment method breakdown
 * @route   GET /api/v1/financial-reports/payment-methods
 * @access  Private (Staff with view_financial_reports permission)
 */
exports.getPaymentMethodBreakdown = asyncHandler(async (req, res) => {
  const [breakdown] = await db.query(`
    SELECT 
      payment_method,
      COUNT(*) as order_count,
      COALESCE(SUM(cash_amount), 0) as cash_total,
      COALESCE(SUM(card_paid_amount), 0) as card_total,
      COALESCE(SUM(discount_amount), 0) as discount_total,
      COALESCE(SUM(expenses_amount), 0) as expenses_total
    FROM order_invoices
    WHERE payment_method IS NOT NULL
    GROUP BY payment_method
  `);

  successResponse(res, { breakdown }, 'تم جلب تفاصيل طرق الدفع بنجاح');
});

/**
 * @desc    Get purchase method breakdown
 * @route   GET /api/v1/financial-reports/purchase-methods
 * @access  Private (Staff with view_financial_reports permission)
 */
exports.getPurchaseMethodBreakdown = asyncHandler(async (req, res) => {
  const [breakdown] = await db.query(`
    SELECT 
      purchase_method,
      COUNT(*) as order_count,
      COALESCE(SUM(cash_amount), 0) as cash_total,
      COALESCE(SUM(card_paid_amount), 0) as card_total
    FROM order_invoices
    WHERE purchase_method IS NOT NULL
    GROUP BY purchase_method
  `);

  successResponse(res, { breakdown }, 'تم جلب تفاصيل طرق الشراء بنجاح');
});

/**
 * @desc    Get orders by position with financial details
 * @route   GET /api/v1/financial-reports/orders-by-position
 * @access  Private (Staff with view_financial_reports permission)
 */
exports.getOrdersByPosition = asyncHandler(async (req, res) => {
  const [ordersByPosition] = await db.query(`
    SELECT 
      op.name as position_name,
      COUNT(o.id) as order_count,
      COALESCE(SUM(oi.cash_amount), 0) as cash_amount,
      COALESCE(SUM(oi.card_paid_amount), 0) as card_amount,
      COALESCE(SUM(oi.discount_amount), 0) as discount_amount,
      COALESCE(SUM(oi.expenses_amount), 0) as expenses_amount
    FROM orders o
    INNER JOIN order_position op ON o.position_id = op.id
    LEFT JOIN order_invoices oi ON o.id = oi.order_id
    WHERE o.is_active = 1
    GROUP BY op.id, op.name
    ORDER BY op.id
  `);

  successResponse(res, { ordersByPosition }, 'تم جلب الطلبات حسب الحالة بنجاح');
});

module.exports = exports;

