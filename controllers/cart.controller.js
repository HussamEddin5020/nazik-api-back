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

  successResponse(res, formattedCarts);
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
    `SELECT o.id, o.customer_id, o.position_id, o.barcode,
            op.name as position_name,
            u.name as customer_name,
            od.title, od.total
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN order_details od ON o.id = od.order_id
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

/**
 * @desc    Update cart availability
 * @route   PUT /api/v1/carts/:id/availability
 * @access  Private (Staff)
 */
exports.updateCartAvailability = asyncHandler(async (req, res) => {
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
  }, 'تم تحديث حالة العربة بنجاح');
});

module.exports = exports;