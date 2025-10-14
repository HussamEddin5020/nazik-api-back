const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, formatCartNumber } = require('../utils/helpers');

/**
 * @desc    Get all carts with orders count and status
 * @route   GET /api/v1/carts
 * @access  Private (User only)
 */
const getAllCarts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      c.id,
      c.orders_count,
      c.is_available,
      COUNT(o.id) as actual_orders_count,
      SUM(CASE WHEN o.position_id = 2 THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN o.position_id = 3 THEN 1 ELSE 0 END) as purchased_orders,
      SUM(CASE WHEN o.position_id > 3 THEN 1 ELSE 0 END) as completed_orders
    FROM cart c
    LEFT JOIN orders o ON o.cart_id = c.id AND o.is_archived = 0
  `;

  const params = [];
  
  if (status === 'open') {
    query += ' WHERE c.is_available = 1';
  } else if (status === 'closed') {
    query += ' WHERE c.is_available = 0';
  }

  query += ' GROUP BY c.id ORDER BY c.id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [carts] = await db.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM cart';
  if (status === 'open') {
    countQuery += ' WHERE is_available = 1';
  } else if (status === 'closed') {
    countQuery += ' WHERE is_available = 0';
  }

  const [countResult] = await db.query(countQuery);
  const total = countResult[0].total;

  // Format cart numbers
  const formattedCarts = carts.map(cart => ({
    ...cart,
    cart_number: formatCartNumber(cart.id)
  }));

  successResponse(res, {
    carts: formattedCarts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'تم جلب السلات بنجاح');
});

/**
 * @desc    Get cart by ID with all related orders and details
 * @route   GET /api/v1/carts/:id
 * @access  Private (User only)
 */
const getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get cart info
  const [carts] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  if (carts.length === 0) {
    return errorResponse(res, 'السلة غير موجودة', 404);
  }

  // Get orders with full details
  const [orders] = await db.query(
    `SELECT 
      o.id,
      o.customer_id,
      o.position_id,
      o.cart_id,
      o.box_id,
      o.purchase_method,
      o.is_archived,
      o.order_invoice_id,
      o.brand_id,
      o.created_at,
      o.updated_at,
      od.image_url,
      od.title,
      od.description,
      od.notes,
      od.color,
      od.size,
      od.capacity,
      od.prepaid_value,
      -- الأسعار الحقيقية من order_invoices
      oi.item_price as original_product_price,
      oi.item_price as commission, -- نفس السعر مؤقتاً
      oi.total_amount as order_total,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email,
      c.phone as customer_phone,
      op.name as position_name,
      b.name as brand_name,
      oi.id as invoice_id,
      oi.invoice_number,
      oi.quantity,
      oi.total_amount as invoice_total,
      oi.payment_method as invoice_payment_method,
      oi.cash_amount,
      oi.card_paid_amount,
      oi.discount_amount,
      oi.expenses_amount
    FROM orders o
    INNER JOIN order_details od ON od.order_id = o.id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN brands b ON b.id = o.brand_id
    LEFT JOIN order_invoices oi ON oi.order_id = o.id
    WHERE o.cart_id = ? AND o.is_archived = 0
    ORDER BY o.created_at DESC`,
    [id]
  );

  const cartData = {
    ...carts[0],
    cart_number: formatCartNumber(carts[0].id),
    orders
  };

  successResponse(res, cartData, 'تم جلب بيانات السلة بنجاح');
});

/**
 * @desc    Create new cart
 * @route   POST /api/v1/carts
 * @access  Private (User only)
 */
const createCart = asyncHandler(async (req, res) => {
  const [result] = await db.query(
    'INSERT INTO cart (orders_count, is_available) VALUES (0, 1)'
  );

  const [cart] = await db.query('SELECT * FROM cart WHERE id = ?', [result.insertId]);

  successResponse(res, {
    ...cart[0],
    cart_number: formatCartNumber(cart[0].id)
  }, 'تم إنشاء السلة بنجاح', 201);
});

/**
 * @desc    Update cart availability
 * @route   PUT /api/v1/carts/:id/availability
 * @access  Private (User only)
 */
const updateCartAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;

  if (is_available === undefined) {
    return errorResponse(res, 'حالة التوفر مطلوبة', 400);
  }

  await db.query(
    'UPDATE cart SET is_available = ? WHERE id = ?',
    [is_available ? 1 : 0, id]
  );

  const [cart] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  successResponse(res, {
    ...cart[0],
    cart_number: formatCartNumber(cart[0].id)
  }, 'تم تحديث حالة السلة بنجاح');
});

module.exports = {
  getAllCarts,
  getCartById,
  createCart,
  updateCartAvailability,
};
