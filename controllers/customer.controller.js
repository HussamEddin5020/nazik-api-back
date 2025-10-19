const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, sanitizeUser, getPagination, buildPaginationResponse } = require('../utils/helpers');

/**
 * @desc    Get all customers
 * @route   GET /api/v1/customers
 * @access  Private (Staff)
 */
exports.getAllCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  let query = `
    SELECT c.id as customer_id, c.user_id, c.address_id, c.created_at,
           u.name, u.email, u.phone, u.status,
           a.city_id, a.area_id, a.street,
           ci.name as city_name, ar.name as area_name
    FROM customers c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN addresses a ON c.address_id = a.id
    LEFT JOIN cities ci ON a.city_id = ci.id
    LEFT JOIN areas ar ON a.area_id = ar.id
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Get total
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination
  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageLimit, offset);

  const [customers] = await db.query(query, params);

  successResponse(res, buildPaginationResponse(customers, page, limit, total));
});

/**
 * @desc    Get customer by ID
 * @route   GET /api/v1/customers/:id
 * @access  Private
 */
exports.getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [customers] = await db.query(
    `SELECT c.id as customer_id, c.user_id, c.address_id, c.created_at,
            u.name, u.email, u.phone, u.status,
            a.city_id, a.area_id, a.street,
            ci.name as city_name, ar.name as area_name
     FROM customers c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN addresses a ON c.address_id = a.id
     LEFT JOIN cities ci ON a.city_id = ci.id
     LEFT JOIN areas ar ON a.area_id = ar.id
     WHERE c.id = ?`,
    [id]
  );

  if (customers.length === 0) {
    return errorResponse(res, 'العميل غير موجود', 404);
  }

  successResponse(res, customers[0]);
});

/**
 * @desc    Update customer
 * @route   PUT /api/v1/customers/:id
 * @access  Private
 */
exports.updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  // Get customer's user_id
  const [customers] = await db.query('SELECT user_id FROM customers WHERE id = ?', [id]);

  if (customers.length === 0) {
    return errorResponse(res, 'العميل غير موجود', 404);
  }

  const userId = customers[0].user_id;

  // Update user table
  const updates = [];
  const values = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }

  if (email) {
    updates.push('email = ?');
    values.push(email);
  }

  if (phone) {
    updates.push('phone = ?');
    values.push(phone);
  }

  if (updates.length > 0) {
    values.push(userId);
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  successResponse(res, null, 'تم تحديث بيانات العميل بنجاح');
});

/**
 * @desc    Update customer address
 * @route   PUT /api/v1/customers/:id/address
 * @access  Private
 */
exports.updateCustomerAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { city_id, area_id, street } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get customer's current address
    const [customers] = await connection.query(
      'SELECT address_id FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return errorResponse(res, 'العميل غير موجود', 404);
    }

    const addressId = customers[0].address_id;

    if (addressId) {
      // Update existing address
      await connection.query(
        'UPDATE addresses SET city_id = ?, area_id = ?, street = ? WHERE id = ?',
        [city_id, area_id, street || null, addressId]
      );
    } else {
      // Create new address
      const [addressResult] = await connection.query(
        'INSERT INTO addresses (city_id, area_id, street) VALUES (?, ?, ?)',
        [city_id, area_id, street || null]
      );

      // Update customer with new address_id
      await connection.query(
        'UPDATE customers SET address_id = ? WHERE id = ?',
        [addressResult.insertId, id]
      );
    }

    await connection.commit();

    successResponse(res, null, 'تم تحديث العنوان بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get customer orders
 * @route   GET /api/v1/customers/:id/orders
 * @access  Private
 */
exports.getCustomerOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  const [orders] = await db.query(
    `SELECT o.id, o.position_id, o.created_at, o.updated_at,
            o.barcode,
            op.name as position_name,
            od.title
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN order_details od ON o.id = od.order_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [id, pageLimit, offset]
  );

  // Get total
  const [countResult] = await db.query(
    'SELECT COUNT(*) as total FROM orders WHERE customer_id = ? AND is_archived = 0',
    [id]
  );

  successResponse(res, buildPaginationResponse(orders, page, limit, countResult[0].total));
});

module.exports = exports;


