const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');
const db = require('../config/database');

/**
 * @desc    Get all received orders (position_id = 8)
 * @route   GET /api/v1/received-orders
 * @access  Private (User only)
 */
const getAllReceivedOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE o.position_id = 8 AND o.is_active = 1';
  const queryParams = [];

  // Search by customer name or order title
  if (search) {
    whereClause += ' AND (u.name LIKE ? OR od.title LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  // Get received orders
  const query = `
    SELECT 
      o.id,
      o.cart_id,
      o.collection_id,
      o.position_id,
      op.name as position_name,
      o.created_at,
      o.updated_at,
      od.title,
      od.description,
      od.image_url,
      od.color,
      od.size,
      oi.quantity,
      oi.item_price,
      oi.total_amount,
      b.name as brand_name,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      col.prepaid_value,
      col.total as collection_total
    FROM orders o
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    LEFT JOIN brands b ON b.id = o.brand_id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN collections col ON col.id = o.collection_id
    ${whereClause}
    ORDER BY o.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const [orders] = await db.query(query, [...queryParams, parseInt(limit), offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = c.user_id
    ${whereClause}
  `;

  const [countResult] = await db.query(countQuery, queryParams);
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  successResponse(res, {
    orders,
    pagination: {
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, 'تم جلب الطلبات المستلمة بنجاح');
});

/**
 * @desc    Get received order by ID
 * @route   GET /api/v1/received-orders/:id
 * @access  Private (User only)
 */
const getReceivedOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orderResult] = await db.query(
    `SELECT 
      o.id,
      o.cart_id,
      o.collection_id,
      o.position_id,
      op.name as position_name,
      o.created_at,
      o.updated_at,
      od.title,
      od.description,
      od.image_url,
      od.color,
      od.size,
      oi.quantity,
      oi.item_price,
      oi.total_amount,
      b.name as brand_name,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      col.prepaid_value,
      col.total as collection_total
    FROM orders o
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    LEFT JOIN brands b ON b.id = o.brand_id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN collections col ON col.id = o.collection_id
    WHERE o.id = ? AND o.position_id = 8 AND o.is_active = 1`,
    [id]
  );

  if (orderResult.length === 0) {
    return errorResponse(res, 'الطلب غير موجود', 404);
  }

  successResponse(res, orderResult[0], 'تم جلب تفاصيل الطلب بنجاح');
});

module.exports = {
  getAllReceivedOrders,
  getReceivedOrderById,
};

