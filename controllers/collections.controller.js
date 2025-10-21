const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');
const db = require('../config/database');

// Helper function to get status name
const getStatusName = (status) => {
  switch (status) {
    case 1:
      return 'قيد الإجراء';
    case 2:
      return 'استلام جزئي';
    case 3:
      return 'استلام كلي';
    default:
      return 'غير محدد';
  }
};

// Helper function to update collection status in database
const updateCollectionStatus = async (collectionId, calculatedStatus) => {
  try {
    await db.query(
      'UPDATE collections SET status = ? WHERE id = ?',
      [calculatedStatus, collectionId]
    );
    console.log(`✅ Updated collection ${collectionId} status to ${calculatedStatus}`);
  } catch (error) {
    console.error(`❌ Error updating collection ${collectionId} status:`, error);
  }
};

/**
 * @desc    Get all collections with dynamic status calculation
 * @route   GET /api/v1/collections
 * @access  Private (User only)
 */
const getAllCollections = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const queryParams = [];

  // Search by customer name
  if (search) {
    whereClause += ' AND u.name LIKE ?';
    queryParams.push(`%${search}%`);
  }

  // Get collections with order statistics
  const query = `
    SELECT 
      col.id,
      col.customer_id,
      col.status as db_status,
      col.prepaid_value,
      col.total,
      col.created_at,
      col.updated_at,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      COUNT(DISTINCT o.id) as total_orders,
      COUNT(DISTINCT CASE WHEN o.position_id >= 6 THEN o.id END) as received_orders,
      COUNT(DISTINCT CASE WHEN o.position_id >= 6 THEN o.id END) as ready_orders
    FROM collections col
    INNER JOIN customers c ON c.id = col.customer_id
    INNER JOIN users u ON u.id = c.user_id
    LEFT JOIN orders o ON o.collection_id = col.id AND o.is_active = 1
    ${whereClause}
    GROUP BY col.id, col.customer_id, col.status, col.prepaid_value, col.total, 
             col.created_at, col.updated_at, u.name, u.email, u.phone
    ORDER BY col.id DESC
    LIMIT ? OFFSET ?
  `;

  const [collections] = await db.query(query, [...queryParams, parseInt(limit), offset]);

  // Calculate dynamic status for each collection and update database
  const enhancedCollections = await Promise.all(collections.map(async col => {
    let calculatedStatus = 1;
    
    if (col.received_orders === col.total_orders && col.total_orders > 0) {
      calculatedStatus = 3; // تجميع كلي (جميع الطلبات position_id >= 6)
    } else if (col.received_orders > 0) {
      calculatedStatus = 2; // تجميع جزئي
    }
    
    // Update collection status in database if different
    if (col.status !== calculatedStatus) {
      await updateCollectionStatus(col.id, calculatedStatus);
    }
    
    return {
      ...col,
      calculated_status: calculatedStatus,
      status_name: getStatusName(calculatedStatus)
    };
  }));

  // Filter by calculated status if requested
  let filteredCollections = enhancedCollections;
  if (status) {
    filteredCollections = enhancedCollections.filter(
      col => col.calculated_status === parseInt(status)
    );
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT col.id) as total
    FROM collections col
    INNER JOIN customers c ON c.id = col.customer_id
    INNER JOIN users u ON u.id = c.user_id
    ${whereClause}
  `;

  const [countResult] = await db.query(countQuery, queryParams);
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  successResponse(res, {
    collections: filteredCollections,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredCollections.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, 'تم جلب المجموعات بنجاح');
});

/**
 * @desc    Get collection by ID with orders details
 * @route   GET /api/v1/collections/:id
 * @access  Private (User only)
 */
const getCollectionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get collection details
  const [collectionResult] = await db.query(
    `SELECT 
      col.id,
      col.customer_id,
      col.status as db_status,
      col.prepaid_value,
      col.total,
      col.created_at,
      col.updated_at,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone
    FROM collections col
    INNER JOIN customers c ON c.id = col.customer_id
    INNER JOIN users u ON u.id = c.user_id
    WHERE col.id = ?`,
    [id]
  );

  if (collectionResult.length === 0) {
    return errorResponse(res, 'المجموعة غير موجودة', 404);
  }

  const collection = collectionResult[0];

  // Get all orders in this collection
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
      b.name as brand_name,
      o.created_at,
      o.updated_at
    FROM orders o
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    LEFT JOIN brands b ON b.id = o.brand_id
    WHERE o.collection_id = ? AND o.is_active = 1
    ORDER BY o.position_id DESC, o.created_at DESC`,
    [id]
  );

  // Calculate dynamic status
  const totalOrders = ordersResult.length;
  const receivedOrders = ordersResult.filter(o => o.position_id >= 6).length;
  const readyOrders = ordersResult.filter(o => o.position_id >= 6).length;

  let calculatedStatus = 1;
  if (receivedOrders === totalOrders && totalOrders > 0) {
    calculatedStatus = 3; // تجميع كلي (جميع الطلبات position_id >= 6)
  } else if (receivedOrders > 0) {
    calculatedStatus = 2; // تجميع جزئي
  }

  // Update collection status in database if different
  if (collection.status !== calculatedStatus) {
    await updateCollectionStatus(collection.id, calculatedStatus);
  }

  const collectionData = {
    ...collection,
    orders: ordersResult,
    total_orders: totalOrders,
    received_orders: receivedOrders,
    ready_orders: readyOrders,
    calculated_status: calculatedStatus,
    status_name: getStatusName(calculatedStatus)
  };

  successResponse(res, collectionData, 'تم جلب تفاصيل المجموعة بنجاح');
});

/**
 * @desc    Send single order to delivery (position_id 6 → 7)
 * @route   PUT /api/v1/collections/:collectionId/orders/:orderId/send
 * @access  Private (User only)
 */
const sendOrderToDelivery = asyncHandler(async (req, res) => {
  const { collectionId, orderId } = req.params;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if order exists and is in collection
    const [orderCheck] = await connection.query(
      `SELECT id, position_id, collection_id 
       FROM orders 
       WHERE id = ? AND collection_id = ? AND is_active = 1`,
      [orderId, collectionId]
    );

    if (orderCheck.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود في هذه المجموعة', 404);
    }

    const order = orderCheck[0];

    if (order.position_id !== 6) {
      await connection.rollback();
      return errorResponse(res, 'الطلب ليس في حالة التجميع (position_id = 6)', 400);
    }

    // Update order to delivery (position_id = 7)
    await connection.query(
      'UPDATE orders SET position_id = 7 WHERE id = ?',
      [orderId]
    );

    // Calculate new collection status after order update
    const [statusCheck] = await connection.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN position_id >= 6 THEN 1 END) as received_orders,
        COUNT(CASE WHEN position_id >= 6 THEN 1 END) as ready_orders
      FROM orders 
      WHERE collection_id = ? AND is_active = 1
    `, [collectionId]);

    const { total_orders, received_orders, ready_orders } = statusCheck[0];
    let newCalculatedStatus = 1;
    
    if (received_orders === total_orders && total_orders > 0) {
      newCalculatedStatus = 3; // تجميع كلي (جميع الطلبات position_id >= 6)
    } else if (received_orders > 0) {
      newCalculatedStatus = 2; // تجميع جزئي
    }

    // Update collection status in database
    await connection.query(
      'UPDATE collections SET status = ? WHERE id = ?',
      [newCalculatedStatus, collectionId]
    );

    await connection.commit();

    successResponse(res, {
      collection_id: parseInt(collectionId),
      order_id: parseInt(orderId)
    }, 'تم إرسال الطلب للتوصيل بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Send all collection orders to delivery (position_id 6 → 7)
 * @route   PUT /api/v1/collections/:id/send-all
 * @access  Private (User only)
 */
const sendAllCollectionOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Check if collection exists
    const [collectionCheck] = await connection.query(
      'SELECT id FROM collections WHERE id = ?',
      [id]
    );

    if (collectionCheck.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'المجموعة غير موجودة', 404);
    }

    // Check that all orders are in position_id = 6
    const [ordersCheck] = await connection.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN position_id = 6 THEN 1 END) as ready_orders
      FROM orders 
      WHERE collection_id = ? AND is_active = 1`,
      [id]
    );

    const { total_orders, ready_orders } = ordersCheck[0];

    if (total_orders === 0) {
      await connection.rollback();
      return errorResponse(res, 'لا توجد طلبات في هذه المجموعة', 400);
    }

    if (ready_orders !== total_orders) {
      await connection.rollback();
      return errorResponse(res, `ليست جميع الطلبات في حالة التجميع (${ready_orders} من ${total_orders})`, 400);
    }

    // Update all orders to delivery (position_id = 7)
    const [updateResult] = await connection.query(
      'UPDATE orders SET position_id = 7 WHERE collection_id = ? AND position_id = 6 AND is_active = 1',
      [id]
    );

    // Update collection status to fully completed (status = 3)
    await connection.query(
      'UPDATE collections SET status = 3 WHERE id = ?',
      [id]
    );

    await connection.commit();

    successResponse(res, {
      collection_id: parseInt(id),
      orders_updated: updateResult.affectedRows
    }, `تم إرسال ${updateResult.affectedRows} طلب للتوصيل بنجاح`);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getAllCollections,
  getCollectionById,
  sendOrderToDelivery,
  sendAllCollectionOrders,
};

