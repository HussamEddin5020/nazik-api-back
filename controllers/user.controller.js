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
    // Delete user permissions (using new system - skip for now)
    // await connection.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);
    console.log('Using new roles system - skipping direct permission deletion');

    // Insert new permissions (using new system - skip for now)
    if (permissions && permissions.length > 0) {
      // TODO: Implement role assignment instead of direct permissions
      console.log('Using new roles system - skipping direct permission assignment');
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
    `SELECT 
      np.id as permission_id,
      np.name as permission_name,
      np.module,
      np.action,
      r.name as role_name
     FROM v_user_permissions vup
     JOIN new_permissions np ON vup.permission_id = np.id
     JOIN roles r ON vup.role_name = r.name
     WHERE vup.user_id = ?`,
    [id]
  );

  successResponse(res, permissions);
});

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/users/permissions/list
 * @access  Private (Staff)
 */
exports.getAllPermissions = asyncHandler(async (req, res) => {
  const [permissions] = await db.query(
    'SELECT id, name, description FROM permissions ORDER BY id'
  );

  successResponse(res, { permissions });
});

/**
 * @desc    Get all actions
 * @route   GET /api/v1/users/actions/list
 * @access  Private (Staff)
 */
exports.getAllActions = asyncHandler(async (req, res) => {
  const [actions] = await db.query(
    'SELECT id, name, description FROM actions ORDER BY id'
  );

  successResponse(res, { actions });
});

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private (Staff)
 */
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, type = 'user' } = req.body;

  // Validation
  if (!name || !password) {
    return errorResponse(res, 'الاسم وكلمة المرور مطلوبان', 400);
  }

  if (!email && !phone) {
    return errorResponse(res, 'البريد الإلكتروني أو رقم الهاتف مطلوب', 400);
  }

  // Check if user exists
  const [existingUser] = await db.query(
    'SELECT id FROM users WHERE email = ? OR phone = ?',
    [email || null, phone || null]
  );

  if (existingUser.length > 0) {
    return errorResponse(res, 'المستخدم موجود بالفعل', 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

  // Create user
  const [result] = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, type, status) 
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [name, email || null, phone || null, passwordHash, type]
  );

  const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);

  successResponse(res, sanitizeUser(newUser[0]), 'تم إنشاء المستخدم بنجاح', 201);
});

module.exports = exports;


