const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');
const db = require('../config/database');

/**
 * @desc    Get all boxes
 * @route   GET /api/v1/boxes
 * @access  Private (User only)
 */
const getAllBoxes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, is_available } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let queryParams = [];

  // Filter by availability if provided
  if (is_available !== undefined) {
    whereClause = 'WHERE is_available = ?';
    queryParams.push(is_available);
  }

  // Get boxes with order count
  const [boxesResult] = await db.query(
    `SELECT 
      b.id,
      b.number,
      b.orders_count,
      b.is_available,
      COUNT(o.id) as actual_orders_count
    FROM box b
    LEFT JOIN orders o ON o.box_id = b.id AND o.position_id IN (3, 4)
    ${whereClause}
    GROUP BY b.id, b.number, b.orders_count, b.is_available
    ORDER BY b.id DESC
    LIMIT ? OFFSET ?`,
    [...queryParams, parseInt(limit), offset]
  );

  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM box b ${whereClause}`,
    queryParams
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  successResponse(res, {
    boxes: boxesResult,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, 'تم جلب الصناديق بنجاح');
});

/**
 * @desc    Get box by ID with orders
 * @route   GET /api/v1/boxes/:id
 * @access  Private (User only)
 */
const getBoxById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get box details
  const [boxResult] = await db.query(
    `SELECT 
      b.id,
      b.number,
      b.orders_count,
      b.is_available,
      COUNT(o.id) as actual_orders_count
    FROM box b
    LEFT JOIN orders o ON o.box_id = b.id AND o.position_id IN (3, 4)
    WHERE b.id = ?
    GROUP BY b.id, b.number, b.orders_count, b.is_available`,
    [id]
  );

  if (boxResult.length === 0) {
    return errorResponse(res, 'الصندوق غير موجود', 404);
  }

  const box = boxResult[0];

  // Get orders in this box
  const [ordersResult] = await db.query(
    `SELECT 
      o.id,
      o.position_id,
      op.name as position_name,
      od.title,
      od.description,
      od.image_url,
      od.color,
      od.size,
      oi.quantity,
      oi.item_price,
      oi.total_amount,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      b.name as brand_name,
      o.created_at,
      o.updated_at
    FROM orders o
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN users u ON u.id = c.user_id
    LEFT JOIN brands b ON b.id = o.brand_id
    WHERE o.box_id = ? AND o.position_id IN (3, 4)
    ORDER BY o.created_at DESC`,
    [id]
  );

  successResponse(res, {
    box,
    orders: ordersResult
  }, 'تم جلب تفاصيل الصندوق بنجاح');
});

/**
 * @desc    Create new box
 * @route   POST /api/v1/boxes
 * @access  Private (User only)
 */
const createBox = asyncHandler(async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return errorResponse(res, 'رقم الصندوق مطلوب', 400);
  }

  // Check if box number already exists
  const [existingBox] = await db.query(
    'SELECT id FROM box WHERE number = ?',
    [number]
  );

  if (existingBox.length > 0) {
    return errorResponse(res, 'رقم الصندوق موجود مسبقاً', 400);
  }

  // Create new box
  const [result] = await db.query(
    'INSERT INTO box (number, orders_count, is_available) VALUES (?, 0, 1)',
    [number]
  );

  // Get the created box
  const [newBox] = await db.query(
    'SELECT * FROM box WHERE id = ?',
    [result.insertId]
  );

  successResponse(res, newBox[0], 'تم إنشاء الصندوق بنجاح', 201);
});

/**
 * @desc    Close box (mark as unavailable and update orders to shipping)
 * @route   PUT /api/v1/boxes/:id/close
 * @access  Private (User only)
 */
const closeBox = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if box exists and is available
    const [boxResult] = await connection.query(
      'SELECT id, is_available FROM box WHERE id = ?',
      [id]
    );

    if (boxResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الصندوق غير موجود', 404);
    }

    const box = boxResult[0];

    if (!box.is_available) {
      await connection.rollback();
      return errorResponse(res, 'الصندوق مغلق بالفعل', 400);
    }

    // Close the box
    await connection.query(
      'UPDATE box SET is_available = 0 WHERE id = ?',
      [id]
    );

    await connection.commit();

    successResponse(res, {
      box_id: id,
      orders_updated: 0
    }, 'تم إغلاق الصندوق بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get available orders (position_id = 3) that can be added to boxes
 * @route   GET /api/v1/boxes/available-orders
 * @access  Private (User only)
 */
const getAvailableOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const [ordersResult] = await db.query(
    `SELECT 
      o.id,
      o.position_id,
      op.name as position_name,
      od.title,
      od.description,
      od.image_url,
      od.color,
      od.size,
      oi.quantity,
      oi.item_price,
      oi.total_amount,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      b.name as brand_name,
      o.created_at,
      o.updated_at
    FROM orders o
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN users u ON u.id = c.user_id
    LEFT JOIN brands b ON b.id = o.brand_id
    WHERE o.position_id = 3 AND (o.box_id IS NULL OR o.box_id = 0)
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?`,
    [parseInt(limit), offset]
  );

  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total 
    FROM orders o 
    WHERE o.position_id = 3 AND (o.box_id IS NULL OR o.box_id = 0)`
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  successResponse(res, {
    orders: ordersResult,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, 'تم جلب الطلبات المتاحة للصناديق بنجاح');
});

/**
 * @desc    Add order to box
 * @route   PUT /api/v1/boxes/:boxId/orders/:orderId
 * @access  Private (User only)
 */
const addOrderToBox = asyncHandler(async (req, res) => {
  const { boxId, orderId } = req.params;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if box exists and is available
    const [boxResult] = await connection.query(
      'SELECT id, is_available FROM box WHERE id = ?',
      [boxId]
    );

    if (boxResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الصندوق غير موجود', 404);
    }

    const box = boxResult[0];

    if (!box.is_available) {
      await connection.rollback();
      return errorResponse(res, 'الصندوق مغلق ولا يمكن إضافة طلبات إليه', 400);
    }

    // Check if order exists and is available (position_id = 3)
    const [orderResult] = await connection.query(
      'SELECT id, position_id, box_id FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود', 404);
    }

    const order = orderResult[0];

    if (order.position_id !== 3) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير متاح لإضافته للصندوق', 400);
    }

    if (order.box_id && order.box_id !== 0) {
      await connection.rollback();
      return errorResponse(res, 'الطلب موجود في صندوق آخر', 400);
    }

    // Add order to box
    await connection.query(
      'UPDATE orders SET box_id = ? WHERE id = ?',
      [boxId, orderId]
    );

    // Update box orders count
    await connection.query(
      'UPDATE box SET orders_count = orders_count + 1 WHERE id = ?',
      [boxId]
    );

    await connection.commit();

    successResponse(res, {
      box_id: boxId,
      order_id: orderId
    }, 'تم إضافة الطلب إلى الصندوق بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Remove order from box
 * @route   DELETE /api/v1/boxes/:boxId/orders/:orderId
 * @access  Private (User only)
 */
const removeOrderFromBox = asyncHandler(async (req, res) => {
  const { boxId, orderId } = req.params;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if order is in this box
    const [orderResult] = await connection.query(
      'SELECT id, box_id FROM orders WHERE id = ? AND box_id = ?',
      [orderId, boxId]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود في هذا الصندوق', 404);
    }

    // Remove order from box
    await connection.query(
      'UPDATE orders SET box_id = NULL WHERE id = ?',
      [orderId]
    );

    // Update box orders count
    await connection.query(
      'UPDATE box SET orders_count = GREATEST(orders_count - 1, 0) WHERE id = ?',
      [boxId]
    );

    await connection.commit();

    successResponse(res, {
      box_id: boxId,
      order_id: orderId
    }, 'تم إزالة الطلب من الصندوق بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getAllBoxes,
  getBoxById,
  createBox,
  closeBox,
  getAvailableOrders,
  addOrderToBox,
  removeOrderFromBox,
};
