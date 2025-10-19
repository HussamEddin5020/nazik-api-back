const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, formatCartNumber } = require('../utils/helpers');

/**
 * @desc    Get all carts
 * @route   GET /api/v1/carts
 * @access  Private (Staff)
 */
exports.getAllCarts = asyncHandler(async (req, res) => {
  const { is_available } = req.query;

  let query = 'SELECT * FROM cart WHERE 1=1';
  const params = [];

  if (is_available !== undefined) {
    query += ' AND is_available = ?';
    params.push(is_available === 'true' ? 1 : 0);
  }

  query += ' ORDER BY id DESC';

  const [carts] = await db.query(query, params);

  // Format cart numbers
  const formattedCarts = carts.map(cart => ({
    ...cart,
    cart_number: formatCartNumber(cart.id)
  }));

  successResponse(res, {
    carts: formattedCarts,
    pagination: {
      page: 1,
      limit: formattedCarts.length,
      total: formattedCarts.length,
      totalPages: 1,
    },
  }, 'تم جلب السلات بنجاح');
});

/**
 * @desc    Get cart by ID with orders
 * @route   GET /api/v1/carts/:id
 * @access  Private (Staff)
 */
exports.getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get cart info
  const [carts] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  if (carts.length === 0) {
    return errorResponse(res, 'العربة غير موجودة', 404);
  }

  // Get cart orders
  const [orders] = await db.query(
    `SELECT o.id,
            o.created_at,
            o.updated_at,
            o.barcode,
            o.cart_id,
            o.brand_id,
            b.name as brand_name,
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
            c.id as customer_id,
            o.position_id,
            cart.is_available as cart_is_available
     FROM orders o
     LEFT JOIN order_details od ON o.id = od.order_id
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN brands b ON o.brand_id = b.id
     LEFT JOIN cart ON o.cart_id = cart.id
     LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
     WHERE o.cart_id = ?
     ORDER BY o.created_at DESC`,
    [id]
  );

  const cartData = {
    ...carts[0],
    cart_number: formatCartNumber(carts[0].id),
    orders
  };

  successResponse(res, cartData);
});

/**
 * @desc    Create new cart
 * @route   POST /api/v1/carts
 * @access  Private (Staff)
 */
exports.createCart = asyncHandler(async (req, res) => {
  const [result] = await db.query(
    'INSERT INTO cart (orders_count, is_available) VALUES (0, 1)'
  );

  const [cart] = await db.query('SELECT * FROM cart WHERE id = ?', [result.insertId]);

  successResponse(res, {
    ...cart[0],
    cart_number: formatCartNumber(cart[0].id)
  }, 'تم إنشاء العربة بنجاح', 201);
});

// تم إلغاء API إغلاق السلة يدوياً - السلة تُغلق تلقائياً عند تأكيد شراء جميع الطلبات

module.exports = exports;