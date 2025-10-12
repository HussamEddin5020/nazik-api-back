const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, sanitizeUser, getPagination, buildPaginationResponse } = require('../utils/helpers');
const bcrypt = require('bcrypt');

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private (Staff)
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status, search } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Get total
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageLimit, offset);

  const [users] = await db.query(query, params);

  // Sanitize users
  const sanitizedUsers = users.map(user => sanitizeUser(user));

  successResponse(res, buildPaginationResponse(sanitizedUsers, page, limit, total));
});

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private (Staff)
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

  if (users.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  successResponse(res, sanitizeUser(users[0]));
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private (Staff)
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, password } = req.body;

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

  if (status) {
    updates.push('status = ?');
    values.push(status);
  }

  if (password) {
    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    updates.push('password_hash = ?');
    values.push(password_hash);
  }

  if (updates.length === 0) {
    return errorResponse(res, 'لا توجد حقول للتحديث', 400);
  }

  values.push(id);

  await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

  successResponse(res, sanitizeUser(updatedUser[0]), 'تم تحديث المستخدم بنجاح');
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Staff)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  successResponse(res, null, 'تم حذف المستخدم بنجاح');
});

/**
 * @desc    Update user permissions
 * @route   PUT /api/v1/users/:id/permissions
 * @access  Private (Staff)
 */
exports.updateUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Delete existing permissions
    await connection.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);

    // Insert new permissions
    if (permissions && permissions.length > 0) {
      const values = permissions.map(p => [id, p.action_id, p.permission_id]);
      await connection.query(
        'INSERT INTO user_permissions (user_id, action_id, permission_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    successResponse(res, null, 'تم تحديث الصلاحيات بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get user permissions
 * @route   GET /api/v1/users/:id/permissions
 * @access  Private (Staff)
 */
exports.getUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [permissions] = await db.query(
    `SELECT up.user_id, up.action_id, up.permission_id,
            p.name as permission_name, p.description as permission_description,
            a.name as action_name, a.description as action_description
     FROM user_permissions up
     JOIN permissions p ON up.permission_id = p.id
     JOIN actions a ON up.action_id = a.id
     WHERE up.user_id = ?`,
    [id]
  );

  successResponse(res, permissions);
});

module.exports = exports;


