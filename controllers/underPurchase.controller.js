const db = require('../config/database');
const { successResponse, errorResponse, buildPaginationResponse } = require('../utils/helpers');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get orders under purchase (position_id = 2)
 * @route   GET /api/v1/under-purchase/orders
 * @access  Private (Staff only)
 */
exports.getUnderPurchaseOrders = asyncHandler(async (req, res) => {
  console.log('🔍 Under Purchase API called:', {
    user: req.user?.id,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  const { page = 1, limit = 20, search = '', brand_id = '' } = req.query;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  let conditions = ['o.position_id = 2'];
  let queryParams = [];

  // Search filter (search in title, customer name, order id, barcode)
  if (search) {
    conditions.push(`(
      od.title LIKE ? OR 
      u.name LIKE ? OR 
      o.id LIKE ? OR 
      o.barcode LIKE ?
    )`);
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // Brand filter
  if (brand_id) {
    conditions.push('o.brand_id = ?');
    queryParams.push(brand_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  console.log('📊 Query conditions:', { conditions, queryParams });

  // Get total count
  const [[{ total }]] = await db.query(
    `SELECT COUNT(DISTINCT o.id) as total
     FROM orders o
     LEFT JOIN order_details od ON o.id = od.order_id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN brands b ON o.brand_id = b.id
     ${whereClause}`,
    queryParams
  );

  // Get orders with details
  const [orders] = await db.query(
    `SELECT 
      o.id,
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
      cu.id as customer_id,
      cart.is_available as cart_is_available
     FROM orders o
     LEFT JOIN order_details od ON o.id = od.order_id
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN brands b ON o.brand_id = b.id
     LEFT JOIN cart ON o.cart_id = cart.id
     LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, parseInt(limit), parseInt(offset)]
  );

  console.log('✅ Orders found:', { count: orders.length, total });

  res.json(buildPaginationResponse(orders, page, limit, total));
});

/**
 * @desc    Get order details by ID
 * @route   GET /api/v1/under-purchase/orders/:id
 * @access  Private (Staff only)
 */
exports.getOrderDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orders] = await db.query(
    `SELECT 
      o.id,
      o.created_at,
      o.updated_at,
      o.barcode,
      o.cart_id,
      o.brand_id,
      b.name as brand_name,
      op.id as position_id,
      op.name as position_name,
      od.id as detail_id,
      od.image_url,
      od.title,
      od.description,
      od.notes,
      od.color,
      od.size,
      od.capacity,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      cu.id as customer_id,
      cu.address_id,
      a.street,
      a.city_id,
      a.area_id,
      ci.name as city_name,
      ar.name as area_name,
      cart.is_available as cart_is_available,
      cart.orders_count as cart_orders_count,
      oi.quantity as invoice_quantity
     FROM orders o
     LEFT JOIN order_details od ON o.id = od.order_id
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers cu ON o.customer_id = cu.id
     LEFT JOIN users u ON cu.user_id = u.id
     LEFT JOIN brands b ON o.brand_id = b.id
     LEFT JOIN cart ON o.cart_id = cart.id
     LEFT JOIN addresses a ON cu.address_id = a.id
     LEFT JOIN cities ci ON a.city_id = ci.id
     LEFT JOIN areas ar ON a.area_id = ar.id
     LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
     WHERE o.id = ? AND o.position_id = 2`,
    [id]
  );

  if (orders.length === 0) {
    return errorResponse(res, 'الطلب غير موجود أو ليس تحت الشراء', 404);
  }

  successResponse(res, orders[0], 'تم جلب تفاصيل الطلب بنجاح');
});

/**
 * @desc    Get all available carts
 * @route   GET /api/v1/under-purchase/carts
 * @access  Private (Staff only)
 */
exports.getAvailableCarts = asyncHandler(async (req, res) => {
  const [carts] = await db.query(
    `SELECT 
      id,
      orders_count,
      is_available,
      CASE 
        WHEN is_available = 1 THEN 'مفتوحة'
        ELSE 'مغلقة'
      END as status_text
     FROM cart
     ORDER BY is_available DESC, id DESC`
  );

  successResponse(res, carts, 'تم جلب السلات بنجاح');
});

/**
 * @desc    Add order to cart
 * @route   POST /api/v1/under-purchase/orders/:id/add-to-cart
 * @access  Private (Staff only with 'add' permission)
 */
exports.addOrderToCart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cart_id } = req.body;

  if (!cart_id) {
    return errorResponse(res, 'يجب تحديد السلة', 400);
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if order exists and is under purchase
    const [[order]] = await connection.query(
      'SELECT id, position_id, cart_id FROM orders WHERE id = ? AND position_id = 2',
      [id]
    );

    if (!order) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود أو ليس تحت الشراء', 404);
    }

    // Check if order already in a cart
    if (order.cart_id) {
      await connection.rollback();
      return errorResponse(res, 'الطلب موجود بالفعل في سلة', 400);
    }

    // Check if cart exists
    const [[cart]] = await connection.query(
      'SELECT id, is_available, orders_count FROM cart WHERE id = ?',
      [cart_id]
    );

    if (!cart) {
      await connection.rollback();
      return errorResponse(res, 'السلة غير موجودة', 404);
    }

    // Check if cart is available
    if (cart.is_available === 0) {
      await connection.rollback();
      return errorResponse(res, 'السلة مغلقة، لا يمكن إضافة طلبات جديدة', 400);
    }

    // Add order to cart
    await connection.query(
      'UPDATE orders SET cart_id = ?, updated_at = NOW() WHERE id = ?',
      [cart_id, id]
    );

    // تحديث cart_id في order_invoices أيضاً
    await connection.query(
      'UPDATE order_invoices SET cart_id = ? WHERE order_id = ?',
      [cart_id, id]
    );

    // Update cart orders count
    await connection.query(
      'UPDATE cart SET orders_count = orders_count + 1 WHERE id = ?',
      [cart_id]
    );

    await connection.commit();

    // Get updated order details
    const [[updatedOrder]] = await connection.query(
      `SELECT o.id, o.cart_id, c.orders_count, c.is_available as cart_is_available
       FROM orders o
       LEFT JOIN cart c ON o.cart_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    successResponse(res, updatedOrder, 'تم إضافة الطلب إلى السلة بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get all brands for filter
 * @route   GET /api/v1/under-purchase/brands
 * @access  Private (Staff only)
 */
exports.getBrands = asyncHandler(async (req, res) => {
  const [brands] = await db.query(
    `SELECT 
      b.id,
      b.name,
      COUNT(o.id) as orders_count
     FROM brands b
     LEFT JOIN orders o ON b.id = o.brand_id AND o.position_id = 2
     GROUP BY b.id, b.name
     ORDER BY b.name ASC`
  );

  successResponse(res, brands, 'تم جلب البراندات بنجاح');
});

/**
 * @desc    Remove order from cart
 * @route   DELETE /api/v1/under-purchase/orders/:id/remove-from-cart
 * @access  Private (Staff only with 'delete' permission)
 */
exports.removeOrderFromCart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if order exists and has a cart
    const [[order]] = await connection.query(
      'SELECT id, cart_id FROM orders WHERE id = ? AND position_id = 2',
      [id]
    );

    if (!order) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود', 404);
    }

    if (!order.cart_id) {
      await connection.rollback();
      return errorResponse(res, 'الطلب ليس في سلة', 400);
    }

    const cartId = order.cart_id;

    // Remove order from cart
    await connection.query(
      'UPDATE orders SET cart_id = NULL, updated_at = NOW() WHERE id = ?',
      [id]
    );

    // Update cart orders count
    await connection.query(
      'UPDATE cart SET orders_count = GREATEST(orders_count - 1, 0) WHERE id = ?',
      [cartId]
    );

    await connection.commit();

    successResponse(res, { id, cart_id: null }, 'تم إزالة الطلب من السلة بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

