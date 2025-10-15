const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');
const db = require('../config/database');

/**
 * @desc    Get all shipments with pagination
 * @route   GET /api/v1/shipments
 * @access  Private (User only)
 */
const getAllShipments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status_id } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const queryParams = [];

  if (status_id) {
    whereClause = 'WHERE s.status_id = ?';
    queryParams.push(status_id);
  }

  const [shipments] = await db.query(
    `SELECT 
      s.id,
      s.box_id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      b.number as box_number,
      sc.company_name,
      ss.name as status_name
    FROM shipments s
    LEFT JOIN box b ON b.id = s.box_id
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    ${whereClause}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?`,
    [...queryParams, parseInt(limit), offset]
  );

  console.log('🚀 Shipments query result:', shipments);

  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM shipments s ${whereClause}`,
    queryParams
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  const responseData = {
    shipments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };

  console.log('🚀 Shipments response data:', JSON.stringify(responseData, null, 2));

  successResponse(res, responseData, 'تم جلب الشحنات بنجاح');
});

/**
 * @desc    Get shipment by ID with box and orders details
 * @route   GET /api/v1/shipments/:id
 * @access  Private (User only)
 */
const getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get shipment details
  const [shipmentResult] = await db.query(
    `SELECT 
      s.id,
      s.box_id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      b.number as box_number,
      sc.company_name,
      ss.name as status_name
    FROM shipments s
    LEFT JOIN box b ON b.id = s.box_id
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    WHERE s.id = ?`,
    [id]
  );

  if (shipmentResult.length === 0) {
    return errorResponse(res, 'الشحنة غير موجودة', 404);
  }

  const shipment = shipmentResult[0];

  // Get orders in the box
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
      od.prepaid_value,
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
    WHERE o.box_id = ? AND o.is_archived = 0
    ORDER BY o.created_at DESC`,
    [shipment.box_id]
  );

  const shipmentData = {
    ...shipment,
    orders: ordersResult
  };

  successResponse(res, shipmentData, 'تم جلب تفاصيل الشحنة بنجاح');
});

/**
 * @desc    Create new shipment
 * @route   POST /api/v1/shipments
 * @access  Private (User only)
 */
const createShipment = asyncHandler(async (req, res) => {
  const { box_id, company_id, sender_name, weight } = req.body;

  // Validate required fields
  if (!box_id || !company_id || !sender_name || !weight) {
    return errorResponse(res, 'جميع الحقول مطلوبة', 400);
  }

  // Check if box exists and is closed
  const [boxResult] = await db.query(
    'SELECT id, is_available FROM box WHERE id = ?',
    [box_id]
  );

  if (boxResult.length === 0) {
    return errorResponse(res, 'الصندوق غير موجود', 404);
  }

  if (boxResult[0].is_available === 1) {
    return errorResponse(res, 'الصندوق مازال مفتوح، يجب إغلاقه أولاً', 400);
  }

  // Check if box already has a shipment
  const [existingShipment] = await db.query(
    'SELECT id FROM shipments WHERE box_id = ?',
    [box_id]
  );

  if (existingShipment.length > 0) {
    return errorResponse(res, 'هذا الصندوق له شحنة موجودة بالفعل', 400);
  }

  // Check if company exists
  const [companyResult] = await db.query(
    'SELECT id FROM shipping_companies WHERE id = ?',
    [company_id]
  );

  if (companyResult.length === 0) {
    return errorResponse(res, 'شركة الشحن غير موجودة', 404);
  }

  // Create shipment
  const [result] = await db.query(
    'INSERT INTO shipments (box_id, company_id, sender_name, weight, status_id) VALUES (?, ?, ?, ?, 1)',
    [box_id, company_id, sender_name, weight]
  );

  // Get created shipment
  const [newShipment] = await db.query(
    `SELECT 
      s.id,
      s.box_id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      b.number as box_number,
      sc.company_name,
      ss.name as status_name
    FROM shipments s
    LEFT JOIN box b ON b.id = s.box_id
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    WHERE s.id = ?`,
    [result.insertId]
  );

  successResponse(res, newShipment[0], 'تم إنشاء الشحنة بنجاح', 201);
});

/**
 * @desc    Send shipment (change status to "جاري الشحن" and update orders position_id to 4)
 * @route   PUT /api/v1/shipments/:id/send
 * @access  Private (User only)
 */
const sendShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if shipment exists and is ready to ship
    const [shipmentResult] = await connection.query(
      'SELECT id, box_id, status_id FROM shipments WHERE id = ?',
      [id]
    );

    if (shipmentResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة غير موجودة', 404);
    }

    const shipment = shipmentResult[0];

    if (shipment.status_id !== 1) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة ليست جاهزة للإرسال', 400);
    }

    // Update shipment status to "جاري الشحن" (status_id = 2)
    await connection.query(
      'UPDATE shipments SET status_id = 2 WHERE id = ?',
      [id]
    );

    // Update all orders in the box from position_id 3 to 4 (shipping)
    const [updateResult] = await connection.query(
      'UPDATE orders SET position_id = 4 WHERE box_id = ? AND position_id = 3',
      [shipment.box_id]
    );

    await connection.commit();

    successResponse(res, {
      shipment_id: id,
      box_id: shipment.box_id,
      orders_updated: updateResult.affectedRows
    }, `تم إرسال الشحنة بنجاح وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الشحن`);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Mark shipment as delivered (change status to "وصلت" and update orders position_id to 5)
 * @route   PUT /api/v1/shipments/:id/deliver
 * @access  Private (User only)
 */
const deliverShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if shipment exists and is in shipping status
    const [shipmentResult] = await connection.query(
      'SELECT id, box_id, status_id FROM shipments WHERE id = ?',
      [id]
    );

    if (shipmentResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة غير موجودة', 404);
    }

    const shipment = shipmentResult[0];

    if (shipment.status_id !== 2) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة ليست في حالة الشحن', 400);
    }

    // Update shipment status to delivered (3)
    await connection.query(
      'UPDATE shipments SET status_id = 3 WHERE id = ?',
      [id]
    );

    // Update all orders in the box to delivered status (position_id = 5)
    const [updateResult] = await connection.query(
      'UPDATE orders SET position_id = 5 WHERE box_id = ? AND position_id = 4',
      [shipment.box_id]
    );

    await connection.commit();

    successResponse(res, {
      shipmentId: parseInt(id),
      boxId: shipment.box_id,
      ordersUpdated: updateResult.affectedRows
    }, `تم تأكيد وصول الشحنة بنجاح وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الوصول`);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get closed boxes (available for shipment)
 * @route   GET /api/v1/shipments/closed-boxes
 * @access  Private (User only)
 */
const getClosedBoxes = asyncHandler(async (req, res) => {
  const [boxes] = await db.query(
    `SELECT 
      b.id,
      b.number,
      b.orders_count,
      COUNT(o.id) as actual_orders_count,
      CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as has_shipment
    FROM box b
    LEFT JOIN orders o ON o.box_id = b.id AND o.is_archived = 0
    LEFT JOIN shipments s ON s.box_id = b.id
    WHERE b.is_available = 0
    GROUP BY b.id, b.number, b.orders_count, s.id
    ORDER BY b.id DESC`
  );

  successResponse(res, { boxes }, 'تم جلب الصناديق المغلقة بنجاح');
});

/**
 * @desc    Get shipping companies
 * @route   GET /api/v1/shipments/companies
 * @access  Private (User only)
 */
const getShippingCompanies = asyncHandler(async (req, res) => {
  const [companies] = await db.query(
    'SELECT id, company_name FROM shipping_companies ORDER BY company_name'
  );

  successResponse(res, { companies }, 'تم جلب شركات الشحن بنجاح');
});

/**
 * @desc    Get all delivered shipments (status_id = 3)
 * @route   GET /api/v1/shipments/delivered
 * @access  Private (User only)
 */
const getDeliveredShipments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  try {
    // Get delivered shipments with their box and order count
    const [shipments] = await db.query(`
      SELECT 
        s.id,
        s.box_id,
        s.weight,
        s.sender_name,
        sc.name as shipping_company_name,
        ss.status_name,
        b.box_number,
        COUNT(o.id) as orders_count
      FROM shipments s
      INNER JOIN shipping_companies sc ON s.shipping_company_id = sc.id
      INNER JOIN shipment_status ss ON s.status_id = ss.id
      INNER JOIN box b ON s.box_id = b.id
      LEFT JOIN orders o ON o.box_id = s.box_id AND o.position_id = 5
      WHERE s.status_id = 3
      GROUP BY s.id, s.box_id, s.weight, s.sender_name, sc.name, ss.status_name, b.box_number
      ORDER BY s.id DESC
      LIMIT ? OFFSET ?
    `, [limitNum, offset]);

    // Get total count for pagination
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM shipments s
      WHERE s.status_id = 3
    `);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    successResponse(res, {
      shipments,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    }, 'تم جلب الشحنات الواصلة بنجاح');

  } catch (error) {
    console.error('Error fetching delivered shipments:', error);
    throw error;
  }
});

/**
 * @desc    Open box - Update all orders in box from position_id 5 to 6
 * @route   PUT /api/v1/shipments/:id/open-box
 * @access  Private (User only)
 */
const openBox = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if shipment exists and is delivered
    const [shipmentResult] = await connection.query(
      'SELECT id, box_id, status_id FROM shipments WHERE id = ?',
      [id]
    );

    if (shipmentResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة غير موجودة', 404);
    }

    const shipment = shipmentResult[0];

    if (shipment.status_id !== 3) {
      await connection.rollback();
      return errorResponse(res, 'الشحنة لم تصل بعد', 400);
    }

    // Update all orders in the box from position_id 5 to 6
    const [updateResult] = await connection.query(
      'UPDATE orders SET position_id = 6 WHERE box_id = ? AND position_id = 5',
      [shipment.box_id]
    );

    await connection.commit();

    successResponse(res, {
      shipmentId: parseInt(id),
      boxId: shipment.box_id,
      ordersUpdated: updateResult.affectedRows
    }, `تم فتح الصندوق بنجاح وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الفتح`);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get orders in delivered shipment box (position_id = 5)
 * @route   GET /api/v1/shipments/:id/box-orders
 * @access  Private (User only)
 */
const getBoxOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if shipment exists and is delivered
    const [shipmentResult] = await db.query(
      'SELECT id, box_id, status_id FROM shipments WHERE id = ?',
      [id]
    );

    if (shipmentResult.length === 0) {
      return errorResponse(res, 'الشحنة غير موجودة', 404);
    }

    const shipment = shipmentResult[0];

    if (shipment.status_id !== 3) {
      return errorResponse(res, 'الشحنة لم تصل بعد', 400);
    }

    // Get orders in the box with position_id = 5 (delivered but not opened)
    const [orders] = await db.query(`
      SELECT 
        o.id,
        o.title,
        o.color,
        o.size,
        o.quantity,
        o.image_url,
        o.created_at,
        o.updated_at,
        od.prepaid_value,
        oi.item_price,
        oi.total_amount,
        oi.commission,
        b.name as brand_name,
        u.first_name,
        u.last_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
      LEFT JOIN brands b ON o.brand_id = b.id
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE o.box_id = ? AND o.position_id = 5
      ORDER BY o.created_at DESC
    `, [shipment.box_id]);

    successResponse(res, {
      shipmentId: parseInt(id),
      boxId: shipment.box_id,
      orders
    }, 'تم جلب طلبات الصندوق بنجاح');

  } catch (error) {
    console.error('Error fetching box orders:', error);
    throw error;
  }
});

module.exports = {
  getAllShipments,
  getShipmentById,
  createShipment,
  sendShipment,
  deliverShipment,
  getDeliveredShipments,
  openBox,
  getBoxOrders,
  getClosedBoxes,
  getShippingCompanies,
};
