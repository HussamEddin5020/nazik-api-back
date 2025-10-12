const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, generateId } = require('../utils/helpers');

/**
 * @desc    Get all invoices
 * @route   GET /api/v1/invoices
 * @access  Private (Staff)
 */
exports.getAllInvoices = asyncHandler(async (req, res) => {
  const [invoices] = await db.query(
    `SELECT oi.*, 
            o.customer_id,
            u.name as customer_name,
            c.orders_count as cart_orders_count
     FROM order_invoices oi
     LEFT JOIN orders o ON oi.order_id = o.id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN cart c ON oi.cart_id = c.id
     ORDER BY oi.invoice_date DESC`
  );

  successResponse(res, invoices);
});

/**
 * @desc    Get invoice by ID
 * @route   GET /api/v1/invoices/:id
 * @access  Private (Staff)
 */
exports.getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [invoices] = await db.query(
    `SELECT oi.*, 
            o.customer_id, o.position_id,
            op.name as order_position,
            u.name as customer_name, u.email as customer_email,
            c.orders_count as cart_orders_count
     FROM order_invoices oi
     LEFT JOIN orders o ON oi.order_id = o.id
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN cart c ON oi.cart_id = c.id
     WHERE oi.id = ?`,
    [id]
  );

  if (invoices.length === 0) {
    return errorResponse(res, 'الفاتورة غير موجودة', 404);
  }

  successResponse(res, invoices[0]);
});

/**
 * @desc    Create new invoice
 * @route   POST /api/v1/invoices
 * @access  Private (Staff)
 */
exports.createInvoice = asyncHandler(async (req, res) => {
  const {
    order_id,
    cart_id,
    item_price,
    quantity,
    total_amount,
    payment_method,
    cash_amount,
    card_id,
    card_paid_amount,
    discount_amount = 0,
    expenses_amount = 0,
    expenses_notes
  } = req.body;

  // Generate invoice number
  const invoice_number = generateId('INV', 8);

  const [result] = await db.query(
    `INSERT INTO order_invoices 
     (invoice_number, item_price, quantity, total_amount, order_id, cart_id,
      payment_method, cash_amount, card_id, card_paid_amount, 
      discount_amount, expenses_amount, expenses_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice_number,
      item_price,
      quantity,
      total_amount,
      order_id,
      cart_id || null,
      payment_method,
      cash_amount || null,
      card_id || null,
      card_paid_amount || null,
      discount_amount,
      expenses_amount,
      expenses_notes || null
    ]
  );

  const [invoice] = await db.query(
    'SELECT * FROM order_invoices WHERE id = ?',
    [result.insertId]
  );

  successResponse(res, invoice[0], 'تم إنشاء الفاتورة بنجاح', 201);
});

/**
 * @desc    Get cart invoices report
 * @route   GET /api/v1/invoices/cart/:cartId
 * @access  Private (Staff)
 */
exports.getCartInvoices = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  const [invoices] = await db.query(
    'SELECT * FROM v_cart_invoices_report WHERE cart_id = ?',
    [cartId]
  );

  successResponse(res, invoices);
});

module.exports = exports;


