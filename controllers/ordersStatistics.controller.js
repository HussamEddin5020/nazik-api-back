const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, buildPaginationResponse } = require('../utils/helpers');

/**
 * @desc    Get all orders with filters (active and cancelled)
 * @route   GET /api/v1/orders-statistics
 * @access  Private
 */
exports.getOrdersStatistics = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, position_id, is_active, search } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      o.id,
      o.position_id,
      o.is_active,
      o.created_at,
      o.updated_at,
      o.barcode,
      op.name as position_name,
      od.image_url,
      od.title,
      od.description,
      od.color,
      od.size,
      od.capacity,
      od.product_link,
      oi.item_price,
      oi.quantity,
      oi.total_amount,
      oi.purchase_method,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      b.name as brand_name,
      cu.id as customer_id
    FROM orders o
    LEFT JOIN order_details od ON o.id = od.order_id
    LEFT JOIN order_position op ON o.position_id = op.id
    LEFT JOIN customers cu ON o.customer_id = cu.id
    LEFT JOIN users u ON cu.user_id = u.id
    LEFT JOIN brands b ON o.brand_id = b.id
    LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
    WHERE 1=1
  `;

  const params = [];

  // Filter by is_active (0 or 1)
  if (is_active !== undefined) {
    query += ' AND o.is_active = ?';
    params.push(is_active);
  }

  // Filter by position_id
  if (position_id) {
    query += ' AND o.position_id = ?';
    params.push(position_id);
  }

  // Search by customer name, email, phone, or order title
  if (search) {
    query += ` AND (
      u.name LIKE ? OR 
      u.email LIKE ? OR 
      u.phone LIKE ? OR 
      od.title LIKE ? OR
      o.id LIKE ?
    )`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Get total count
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT o.id) as total FROM');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination and ordering
  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [orders] = await db.query(query, params);

  successResponse(res, buildPaginationResponse(orders, page, limit, total), 'تم جلب بيانات الطلبات بنجاح');
});

/**
 * @desc    Get order statistics summary with position distribution
 * @route   GET /api/v1/orders-statistics/summary
 * @access  Private
 */
exports.getStatisticsSummary = asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  
  let whereClause = '';
  const params = [];
  
  if (is_active !== undefined) {
    whereClause = 'WHERE o.is_active = ?';
    params.push(is_active);
  }

  const query = `
    SELECT 
      op.id as position_id,
      op.name as position_name,
      COUNT(o.id) as orders_count,
      SUM(CASE WHEN o.is_active = 1 THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN o.is_active = 0 THEN 1 ELSE 0 END) as cancelled_count
    FROM order_position op
    LEFT JOIN orders o ON o.position_id = op.id ${whereClause ? `AND ${whereClause.replace('WHERE', 'o.is_active')}` : ''}
    GROUP BY op.id, op.name
    ORDER BY op.id
  `;

  const [results] = await db.query(query, params);

  const summary = {
    ordersByPosition: results,
    totalPositions: results.length,
    totalOrders: results.reduce((sum, row) => sum + (row.orders_count || 0), 0),
    totalActive: results.reduce((sum, row) => sum + (row.active_count || 0), 0),
    totalCancelled: results.reduce((sum, row) => sum + (row.cancelled_count || 0), 0)
  };

  successResponse(res, summary, 'تم جلب الإحصائيات بنجاح');
});

