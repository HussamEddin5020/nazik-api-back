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
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      sc.company_name,
      ss.name as status_name,
      COUNT(DISTINCT b.id) as boxes_count,
      COUNT(DISTINCT o.id) as orders_count
    FROM shipments s
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    LEFT JOIN box b ON b.shipment_id = s.id
    LEFT JOIN orders o ON o.box_id = b.id AND o.is_active = 1
    ${whereClause}
    GROUP BY s.id, s.company_id, s.sender_name, s.weight, s.status_id, sc.company_name, ss.name
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
 * @desc    Get shipment by ID with boxes and orders details
 * @route   GET /api/v1/shipments/:id
 * @access  Private (User only)
 */
const getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get shipment details
  const [shipmentResult] = await db.query(
    `SELECT 
      s.id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      sc.company_name,
      ss.name as status_name
    FROM shipments s
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    WHERE s.id = ?`,
    [id]
  );

  if (shipmentResult.length === 0) {
    return errorResponse(res, 'الشحنة غير موجودة', 404);
  }

  const shipment = shipmentResult[0];

  // Get all boxes linked to this shipment
  const [boxesResult] = await db.query(
    `SELECT 
      b.id,
      b.number,
      b.orders_count,
      b.status_id,
      bs.name as status_name,
      COUNT(o.id) as actual_orders_count
    FROM box b
    LEFT JOIN box_status bs ON bs.id = b.status_id
    LEFT JOIN orders o ON o.box_id = b.id AND o.is_active = 1
    WHERE b.shipment_id = ?
    GROUP BY b.id, b.number, b.orders_count, b.status_id, bs.name
    ORDER BY b.id ASC`,
    [id]
  );

  // Get all orders from all boxes in this shipment
  const [ordersResult] = await db.query(
    `SELECT 
      o.id,
      o.box_id,
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
    INNER JOIN box bx ON bx.id = o.box_id
    WHERE bx.shipment_id = ? AND o.is_active = 1
    ORDER BY o.box_id ASC, o.created_at DESC`,
    [id]
  );

  const shipmentData = {
    ...shipment,
    boxes: boxesResult,
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
  const { box_ids, company_id, sender_name, weight } = req.body;

  // Validate required fields
  if (!box_ids || !Array.isArray(box_ids) || box_ids.length === 0) {
    return errorResponse(res, 'يجب اختيار صندوق واحد على الأقل', 400);
  }

  if (!company_id || !sender_name || !weight) {
    return errorResponse(res, 'جميع الحقول مطلوبة', 400);
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if company exists
    const [companyResult] = await connection.query(
      'SELECT id FROM shipping_companies WHERE id = ?',
      [company_id]
    );

    if (companyResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'شركة الشحن غير موجودة', 404);
    }

    // Validate all boxes
    for (const boxId of box_ids) {
      // Check if box exists and is closed
      const [boxResult] = await connection.query(
        'SELECT id, is_available, shipment_id FROM box WHERE id = ?',
        [boxId]
      );

      if (boxResult.length === 0) {
        await connection.rollback();
        return errorResponse(res, `الصندوق ${boxId} غير موجود`, 404);
      }

      if (boxResult[0].is_available === 1) {
        await connection.rollback();
        return errorResponse(res, `الصندوق ${boxId} مازال مفتوح، يجب إغلاقه أولاً`, 400);
      }

      if (boxResult[0].shipment_id !== null) {
        await connection.rollback();
        return errorResponse(res, `الصندوق ${boxId} مرتبط بشحنة أخرى بالفعل`, 400);
      }
    }

    // Create shipment
    const [result] = await connection.query(
      'INSERT INTO shipments (company_id, sender_name, weight, status_id) VALUES (?, ?, ?, 1)',
      [company_id, sender_name, weight]
    );

    const shipmentId = result.insertId;

    // Link boxes to shipment
    for (const boxId of box_ids) {
      await connection.query(
        'UPDATE box SET shipment_id = ? WHERE id = ?',
        [shipmentId, boxId]
      );
    }

    await connection.commit();

    // Get created shipment with boxes info
    const [newShipment] = await connection.query(
      `SELECT 
        s.id,
        s.company_id,
        s.sender_name,
        s.weight,
        s.status_id,
        sc.company_name,
        ss.name as status_name,
        COUNT(b.id) as boxes_count
      FROM shipments s
      LEFT JOIN shipping_companies sc ON sc.id = s.company_id
      LEFT JOIN shipment_status ss ON ss.id = s.status_id
      LEFT JOIN box b ON b.shipment_id = s.id
      WHERE s.id = ?
      GROUP BY s.id, s.company_id, s.sender_name, s.weight, s.status_id, sc.company_name, ss.name`,
      [shipmentId]
    );

    successResponse(res, newShipment[0], 'تم إنشاء الشحنة وربط الصناديق بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
      'SELECT id, status_id FROM shipments WHERE id = ?',
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

    // Get all boxes linked to this shipment
    const [boxesResult] = await connection.query(
      'SELECT id FROM box WHERE shipment_id = ?',
      [id]
    );

    if (boxesResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'لا توجد صناديق مرتبطة بهذه الشحنة', 400);
    }

    // Update shipment status to "جاري الشحن" (status_id = 2)
    await connection.query(
      'UPDATE shipments SET status_id = 2 WHERE id = ?',
      [id]
    );

    // Update box status to "جاري الشحن" (status_id = 2)
    await connection.query(
      'UPDATE box SET status_id = 2 WHERE shipment_id = ?',
      [id]
    );

    // Update all orders in all boxes from position_id 3 to 4 (shipping)
    const [updateResult] = await connection.query(
      `UPDATE orders o
       INNER JOIN box b ON b.id = o.box_id
       SET o.position_id = 4
       WHERE b.shipment_id = ? AND o.position_id = 3 AND o.is_active = 1`,
      [id]
    );

    await connection.commit();

    successResponse(res, {
      shipment_id: parseInt(id),
      boxes_count: boxesResult.length,
      orders_updated: updateResult.affectedRows
    }, `تم إرسال الشحنة بنجاح (${boxesResult.length} صندوق) وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الشحن`);

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
      'SELECT id, status_id FROM shipments WHERE id = ?',
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

    // Get all boxes linked to this shipment
    const [boxesResult] = await connection.query(
      'SELECT id FROM box WHERE shipment_id = ?',
      [id]
    );

    // Update shipment status to delivered (3)
    await connection.query(
      'UPDATE shipments SET status_id = 3 WHERE id = ?',
      [id]
    );

    // Update box status to "وصل الصندوق" (status_id = 3)
    await connection.query(
      'UPDATE box SET status_id = 3 WHERE shipment_id = ?',
      [id]
    );

    // Update all orders in all boxes to delivered status (position_id = 5)
    const [updateResult] = await connection.query(
      `UPDATE orders o
       INNER JOIN box b ON b.id = o.box_id
       SET o.position_id = 5
       WHERE b.shipment_id = ? AND o.position_id = 4 AND o.is_active = 1`,
      [id]
    );

    await connection.commit();

    successResponse(res, {
      shipment_id: parseInt(id),
      boxes_count: boxesResult.length,
      orders_updated: updateResult.affectedRows
    }, `تم تأكيد وصول الشحنة بنجاح (${boxesResult.length} صندوق) وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الوصول`);

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
      b.status_id,
      bs.name as status_name,
      COUNT(o.id) as actual_orders_count,
      CASE WHEN b.shipment_id IS NOT NULL THEN 1 ELSE 0 END as has_shipment
    FROM box b
    LEFT JOIN box_status bs ON bs.id = b.status_id
    LEFT JOIN orders o ON o.box_id = b.id AND o.is_active = 1
    WHERE b.is_available = 0 AND b.shipment_id IS NULL
    GROUP BY b.id, b.number, b.orders_count, b.status_id, bs.name, b.shipment_id
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
  const offset = (page - 1) * limit;

  const [shipments] = await db.query(
    `SELECT 
      s.id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      sc.company_name,
      ss.name as status_name,
      COUNT(DISTINCT b.id) as boxes_count,
      COUNT(DISTINCT o.id) as orders_count
    FROM shipments s
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    LEFT JOIN box b ON b.shipment_id = s.id
    LEFT JOIN orders o ON o.box_id = b.id AND o.position_id = 5 AND o.is_active = 1
    WHERE s.status_id = 3
    GROUP BY s.id, s.company_id, s.sender_name, s.weight, s.status_id, sc.company_name, ss.name
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?`,
    [parseInt(limit), offset]
  );

  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM shipments s WHERE s.status_id = 3`
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

  successResponse(res, responseData, 'تم جلب الشحنات الواصلة بنجاح');
});

/**
 * @desc    Open box - Update all orders in all boxes from position_id 5 to 6
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
      'SELECT id, status_id FROM shipments WHERE id = ?',
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

    // Get all boxes linked to this shipment
    const [boxesResult] = await connection.query(
      'SELECT id FROM box WHERE shipment_id = ?',
      [id]
    );

    // Update all boxes status to "opened and collected" (status_id = 4)
    await connection.query(
      `UPDATE box 
       SET status_id = 4 
       WHERE shipment_id = ?`,
      [id]
    );

    // Update all orders in all boxes from position_id 5 to 6
    const [updateResult] = await connection.query(
      `UPDATE orders o
       INNER JOIN box b ON b.id = o.box_id
       SET o.position_id = 6
       WHERE b.shipment_id = ? AND o.position_id = 5 AND o.is_active = 1`,
      [id]
    );

    // Get all collections that have orders in any of these boxes
    const [collectionsResult] = await connection.query(
      `SELECT DISTINCT o.collection_id 
       FROM orders o 
       INNER JOIN box b ON b.id = o.box_id
       WHERE b.shipment_id = ? AND o.collection_id IS NOT NULL AND o.is_active = 1`,
      [id]
    );

    let collectionsUpdated = 0;

    // Update collection status for each collection
    for (const collection of collectionsResult) {
      const collectionId = collection.collection_id;
      
      // Check if all orders in this collection have position_id = 6 (opened)
      const [allOrdersResult] = await connection.query(
        `SELECT COUNT(*) as total_orders,
                SUM(CASE WHEN position_id = 6 THEN 1 ELSE 0 END) as opened_orders
         FROM orders 
         WHERE collection_id = ? AND is_active = 1`,
        [collectionId]
      );

      const { total_orders, opened_orders } = allOrdersResult[0];
      
      let newStatus;
      if (opened_orders === total_orders) {
        // All orders are opened (position_id = 6) - Collection fully received
        newStatus = 3;
      } else if (opened_orders > 0) {
        // Some orders are opened - Collection partially received
        newStatus = 2;
      } else {
        // No orders opened yet - Collection still under process
        newStatus = 1;
      }

      // Update collection status
      await connection.query(
        'UPDATE collections SET status = ? WHERE id = ?',
        [newStatus, collectionId]
      );
      
      collectionsUpdated++;
    }

    await connection.commit();

    successResponse(res, {
      shipment_id: parseInt(id),
      boxes_count: boxesResult.length,
      orders_updated: updateResult.affectedRows,
      collections_updated: collectionsUpdated
    }, `تم فتح صناديق الشحنة بنجاح (${boxesResult.length} صندوق) وتم تحديث ${updateResult.affectedRows} طلب إلى حالة الفتح و ${collectionsUpdated} مجموعة`);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get orders in delivered shipment boxes (position_id = 5)
 * @route   GET /api/v1/shipments/:id/box-orders
 * @access  Private (User only)
 */
const getBoxOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get shipment details first
  const [shipmentResult] = await db.query(
    `SELECT 
      s.id,
      s.company_id,
      s.sender_name,
      s.weight,
      s.status_id,
      sc.company_name,
      ss.name as status_name
    FROM shipments s
    LEFT JOIN shipping_companies sc ON sc.id = s.company_id
    LEFT JOIN shipment_status ss ON ss.id = s.status_id
    WHERE s.id = ? AND s.status_id = 3`,
    [id]
  );

  if (shipmentResult.length === 0) {
    return errorResponse(res, 'الشحنة غير موجودة أو لم تصل بعد', 404);
  }

  const shipment = shipmentResult[0];

  // Get all boxes linked to this shipment
  const [boxesResult] = await db.query(
    `SELECT 
      b.id,
      b.number,
      b.orders_count,
      b.status_id,
      bs.name as status_name
    FROM box b
    LEFT JOIN box_status bs ON bs.id = b.status_id
    WHERE b.shipment_id = ?
    ORDER BY b.id ASC`,
    [id]
  );

  // Get orders in all boxes with position_id = 5
  const [ordersResult] = await db.query(
    `SELECT 
      o.id,
      o.box_id,
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
    INNER JOIN box bx ON bx.id = o.box_id
    WHERE bx.shipment_id = ? AND o.position_id = 5 AND o.is_active = 1
    ORDER BY o.box_id ASC, o.created_at DESC`,
    [id]
  );

  const shipmentData = {
    ...shipment,
    boxes: boxesResult,
    orders: ordersResult
  };

  successResponse(res, shipmentData, 'تم جلب طلبات صناديق الشحنة بنجاح');
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
