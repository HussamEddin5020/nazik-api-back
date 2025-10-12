const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, formatBoxNumber } = require('../utils/helpers');

/**
 * @desc    Get all boxes
 * @route   GET /api/v1/boxes
 * @access  Private (Staff)
 */
exports.getAllBoxes = asyncHandler(async (req, res) => {
  const { is_available } = req.query;

  let query = 'SELECT * FROM box WHERE 1=1';
  const params = [];

  if (is_available !== undefined) {
    query += ' AND is_available = ?';
    params.push(is_available === 'true' ? 1 : 0);
  }

  query += ' ORDER BY id DESC';

  const [boxes] = await db.query(query, params);

  successResponse(res, boxes);
});

/**
 * @desc    Get box by ID
 * @route   GET /api/v1/boxes/:id
 * @access  Private (Staff)
 */
exports.getBoxById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [boxes] = await db.query('SELECT * FROM box WHERE id = ?', [id]);

  if (boxes.length === 0) {
    return errorResponse(res, 'الصندوق غير موجود', 404);
  }

  // Get box orders
  const [orders] = await db.query(
    `SELECT o.id, o.barcode, o.position_id,
            op.name as position_name,
            u.name as customer_name
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     WHERE o.box_id = ?`,
    [id]
  );

  const boxData = {
    ...boxes[0],
    orders
  };

  successResponse(res, boxData);
});

/**
 * @desc    Create new box
 * @route   POST /api/v1/boxes
 * @access  Private (Staff)
 */
exports.createBox = asyncHandler(async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return errorResponse(res, 'رقم الصندوق مطلوب', 400);
  }

  const [result] = await db.query(
    'INSERT INTO box (number, orders_count, is_available) VALUES (?, 0, 1)',
    [number]
  );

  const [box] = await db.query('SELECT * FROM box WHERE id = ?', [result.insertId]);

  successResponse(res, box[0], 'تم إنشاء الصندوق بنجاح', 201);
});

/**
 * @desc    Update box
 * @route   PUT /api/v1/boxes/:id
 * @access  Private (Staff)
 */
exports.updateBox = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { number, is_available } = req.body;

  const updates = [];
  const values = [];

  if (number) {
    updates.push('number = ?');
    values.push(number);
  }

  if (is_available !== undefined) {
    updates.push('is_available = ?');
    values.push(is_available ? 1 : 0);
  }

  if (updates.length === 0) {
    return errorResponse(res, 'لا توجد حقول للتحديث', 400);
  }

  values.push(id);

  await db.query(
    `UPDATE box SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const [box] = await db.query('SELECT * FROM box WHERE id = ?', [id]);

  successResponse(res, box[0], 'تم تحديث الصندوق بنجاح');
});

module.exports = exports;


