const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, getPagination, buildPaginationResponse } = require('../utils/helpers');

/**
 * @desc    Get all orders with filters
 * @route   GET /api/v1/orders
 * @access  Private
 */
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, position_id, customer_id, is_archived, search } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  let query = `
    SELECT o.id, o.customer_id, o.position_id, o.created_at, o.updated_at,
           o.cart_id, o.box_id, o.barcode, o.is_archived,
           op.name as position_name,
           u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
           od.title, od.color, od.size, od.product_link, od.image_url,
           oi.item_price, oi.quantity, oi.total_amount, oi.purchase_method,
           b.name as brand_name,
           (SELECT COUNT(*) FROM order_details WHERE order_id = o.id) as details_count
    FROM orders o
    LEFT JOIN order_position op ON o.position_id = op.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN order_details od ON o.id = od.order_id
    LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
    LEFT JOIN brands b ON o.brand_id = b.id
    WHERE 1=1
  `;

  const params = [];

  // Apply filters
  if (position_id) {
    query += ' AND o.position_id = ?';
    params.push(position_id);
  }

  if (customer_id) {
    query += ' AND o.customer_id = ?';
    params.push(customer_id);
  }

  if (is_archived !== undefined) {
    query += ' AND o.is_archived = ?';
    params.push(is_archived === 'true' ? 1 : 0);
  }

  if (search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR od.title LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Get total count
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT o.id) as total FROM');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination and ordering
  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageLimit, offset);

  const [orders] = await db.query(query, params);

  successResponse(res, buildPaginationResponse(orders, page, limit, total));
});

/**
 * @desc    Get customer's own orders
 * @route   GET /api/v1/orders/my-orders
 * @access  Private (Customer)
 */
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  // Get customer_id from user
  const [customers] = await db.query(
    'SELECT id FROM customers WHERE user_id = ?',
    [req.user.id]
  );

  if (customers.length === 0) {
    return errorResponse(res, 'بيانات العميل غير موجودة', 404);
  }

  const customerId = customers[0].id;

  // Get orders
  const [orders] = await db.query(
    `SELECT o.id, o.position_id, o.created_at, o.updated_at,
            o.barcode, o.purchase_method,
            op.name as position_name,
            od.title, od.description, od.color, od.size, od.total, od.image_url
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN order_details od ON o.id = od.order_id
     WHERE o.customer_id = ? AND o.is_archived = 0
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [customerId, pageLimit, offset]
  );

  // Get total
  const [countResult] = await db.query(
    'SELECT COUNT(*) as total FROM orders WHERE customer_id = ? AND is_archived = 0',
    [customerId]
  );

  successResponse(res, buildPaginationResponse(orders, page, limit, countResult[0].total));
});

/**
 * @desc    Get order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
exports.getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orders] = await db.query(
    `SELECT o.*, op.name as position_name,
            u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
            cu.address_id,
            a.city_id, a.area_id, a.street,
            ci.name as city_name, ar.name as area_name,
            od.id as detail_id, od.image_url, od.title, od.description, od.notes,
            od.color, od.size, od.capacity, od.prepaid_value, 
            od.original_product_price, od.commission, od.total
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN addresses a ON cu.address_id = a.id
     LEFT JOIN cities ci ON a.city_id = ci.id
     LEFT JOIN areas ar ON a.area_id = ar.id
     LEFT JOIN order_details od ON o.id = od.order_id
     WHERE o.id = ?`,
    [id]
  );

  if (orders.length === 0) {
    return errorResponse(res, 'الطلب غير موجود', 404);
  }

  // Format response
  const order = {
    id: orders[0].id,
    customer_id: orders[0].customer_id,
    position_id: orders[0].position_id,
    position_name: orders[0].position_name,
    cart_id: orders[0].cart_id,
    box_id: orders[0].box_id,
    barcode: orders[0].barcode,
    purchase_method: orders[0].purchase_method,
    is_archived: orders[0].is_archived,
    created_at: orders[0].created_at,
    updated_at: orders[0].updated_at,
    customer: {
      name: orders[0].customer_name,
      email: orders[0].customer_email,
      phone: orders[0].customer_phone,
      address: {
        city: orders[0].city_name,
        area: orders[0].area_name,
        street: orders[0].street
      }
    },
    details: orders[0].detail_id ? {
      id: orders[0].detail_id,
      image_url: orders[0].image_url,
      title: orders[0].title,
      description: orders[0].description,
      notes: orders[0].notes,
      color: orders[0].color,
      size: orders[0].size,
      capacity: orders[0].capacity,
      prepaid_value: orders[0].prepaid_value,
      original_product_price: orders[0].original_product_price,
      commission: orders[0].commission,
      total: orders[0].total
    } : null
  };

  successResponse(res, order);
});

/**
 * @desc    Create new order
 * @route   POST /api/v1/orders
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customer_id,
      position_id = 1,
      details
    } = req.body;

    // Determine creator based on user type
    const creator_user_id = req.user.type === 'user' ? req.user.id : null;
    const creator_customer_id = req.user.type === 'customer' ? req.user.id : null;

    // Get collection_id for customer (create if doesn't exist)
    let [collections] = await connection.query(
      'SELECT id FROM collections WHERE customer_id = ?',
      [customer_id]
    );

    let collection_id;
    if (collections.length === 0) {
      const [collectionResult] = await connection.query(
        'INSERT INTO collections (customer_id) VALUES (?)',
        [customer_id]
      );
      collection_id = collectionResult.insertId;
    } else {
      collection_id = collections[0].id;
    }

    // Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (creator_user_id, creator_customer_id, customer_id, collection_id, position_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [creator_user_id, creator_customer_id, customer_id, collection_id, position_id]
    );

    const orderId = orderResult.insertId;

    // Insert order details
    if (details) {
      await connection.query(
        `INSERT INTO order_details 
         (order_id, image_url, title, description, notes, color, size, capacity,
          prepaid_value, original_product_price, commission, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          details.image_url || null,
          details.title,
          details.description || null,
          details.notes || null,
          details.color || null,
          details.size || null,
          details.capacity || null,
          details.prepaid_value || 0,
          details.original_product_price || 0,
          details.commission || 0,
          details.total || 0
        ]
      );
    }

    await connection.commit();

    // Get created order
    const [createdOrder] = await connection.query(
      `SELECT o.*, op.name as position_name,
              od.title, od.total
       FROM orders o
       LEFT JOIN order_position op ON o.position_id = op.id
       LEFT JOIN order_details od ON o.id = od.order_id
       WHERE o.id = ?`,
      [orderId]
    );

    successResponse(res, createdOrder[0], 'تم إنشاء الطلب بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Update order
 * @route   PUT /api/v1/orders/:id
 * @access  Private
 */
exports.updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const updates = req.body;
    const allowedFields = ['cart_id', 'box_id', 'barcode', 'purchase_method', 'is_archived'];
    
    const updateFields = [];
    const updateValues = [];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return errorResponse(res, 'لا توجد حقول للتحديث', 400);
    }

    updateValues.push(id);

    await connection.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Update order details if provided
    if (updates.details) {
      const d = updates.details;
      const detailFields = [];
      const detailValues = [];

      const allowedDetailFields = ['image_url', 'title', 'description', 'notes', 'color', 
                                     'size', 'capacity', 'prepaid_value', 
                                     'original_product_price', 'commission', 'total'];

      allowedDetailFields.forEach(field => {
        if (d[field] !== undefined) {
          detailFields.push(`${field} = ?`);
          detailValues.push(d[field]);
        }
      });

      if (detailFields.length > 0) {
        detailValues.push(id);
        await connection.query(
          `UPDATE order_details SET ${detailFields.join(', ')} WHERE order_id = ?`,
          detailValues
        );
      }
    }

    await connection.commit();

    // Get updated order
    const [updatedOrder] = await connection.query(
      `SELECT o.*, op.name as position_name,
              od.title, od.total
       FROM orders o
       LEFT JOIN order_position op ON o.position_id = op.id
       LEFT JOIN order_details od ON o.id = od.order_id
       WHERE o.id = ?`,
      [id]
    );

    successResponse(res, updatedOrder[0], 'تم تحديث الطلب بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Update order position
 * @route   PUT /api/v1/orders/:id/position
 * @access  Private (Staff)
 */
exports.updateOrderPosition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { position_id, reason, notes } = req.body;

  if (!position_id) {
    return errorResponse(res, 'معرف الحالة مطلوب', 400);
  }

  await db.query(
    `UPDATE orders SET position_id = ? WHERE id = ?`,
    [position_id, id]
  );

  // Get updated order with position name
  const [orders] = await db.query(
    `SELECT o.*, op.name as position_name
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     WHERE o.id = ?`,
    [id]
  );

  successResponse(res, orders[0], 'تم تحديث حالة الطلب بنجاح');
});

/**
 * @desc    Delete order
 * @route   DELETE /api/v1/orders/:id
 * @access  Private (Staff)
 */
exports.deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await db.query('DELETE FROM orders WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return errorResponse(res, 'الطلب غير موجود', 404);
  }

  successResponse(res, null, 'تم حذف الطلب بنجاح');
});

/**
 * @desc    Get order status history
 * @route   GET /api/v1/orders/:id/history
 * @access  Private
 */
exports.getOrderHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [history] = await db.query(
    `SELECT * FROM order_status_history 
     WHERE order_id = ? 
     ORDER BY created_at DESC`,
    [id]
  );

  successResponse(res, history);
});

module.exports = exports;


