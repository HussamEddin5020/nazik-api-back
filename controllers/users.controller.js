const bcrypt = require('bcrypt');
const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

// @desc    Get all system users with their permissions
// @route   GET /api/v1/users
// @access  Private (requires manage_users permission)
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = "WHERE u.type = 'user'";
  const params = [];

  if (search) {
    whereClause += " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status) {
    whereClause += " AND u.status = ?";
    params.push(status);
  }

  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Get users with permissions count
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.type,
      u.status,
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT up.permission_id) as permissions_count
    FROM users u
    LEFT JOIN user_permissions up ON up.user_id = u.id
    ${whereClause}
    GROUP BY u.id, u.name, u.email, u.phone, u.type, u.status, u.created_at, u.updated_at
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), offset);
  const [users] = await db.query(query, params);

  successResponse(res, {
    users,
    pagination: {
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total,
      total_pages: Math.ceil(total / parseInt(limit)),
      has_next: offset + users.length < total,
      has_prev: parseInt(page) > 1
    }
  });
});

// @desc    Get single user with permissions
// @route   GET /api/v1/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get user info
  const [userResult] = await db.query(
    `SELECT id, name, email, phone, type, status, created_at, updated_at 
     FROM users WHERE id = ? AND type = 'user'`,
    [id]
  );

  if (userResult.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  const user = userResult[0];

  // Get user permissions
  const [permissions] = await db.query(
    `SELECT 
      up.user_id,
      up.action_id,
      up.permission_id,
      a.name as action_name,
      p.name as permission_name,
      p.description as permission_description
    FROM user_permissions up
    INNER JOIN actions a ON a.id = up.action_id
    INNER JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = ?
    ORDER BY a.id, p.id`,
    [id]
  );

  successResponse(res, {
    user,
    permissions
  });
});

// @desc    Create new system user
// @route   POST /api/v1/users
// @access  Private (requires add permission)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

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
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const [result] = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, type, status) 
     VALUES (?, ?, ?, ?, 'user', 'active')`,
    [name, email || null, phone || null, passwordHash]
  );

  successResponse(res, {
    userId: result.insertId,
    name,
    email,
    phone
  }, 'تم إنشاء المستخدم بنجاح', 201);
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (requires update permission)
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, password } = req.body;

  // Check if user exists
  const [existingUser] = await db.query(
    'SELECT id FROM users WHERE id = ? AND type = \'user\'',
    [id]
  );

  if (existingUser.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  // Build update query
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  if (phone) {
    updates.push('phone = ?');
    params.push(phone);
  }

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (updates.length === 0) {
    return errorResponse(res, 'لا توجد بيانات للتحديث', 400);
  }

  params.push(id);
  await db.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    params
  );

  successResponse(res, { userId: parseInt(id) }, 'تم تحديث المستخدم بنجاح');
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (requires delete permission)
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const [existingUser] = await db.query(
    'SELECT id FROM users WHERE id = ? AND type = \'user\'',
    [id]
  );

  if (existingUser.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  // Delete user (will cascade delete permissions)
  await db.query('DELETE FROM users WHERE id = ?', [id]);

  successResponse(res, { userId: parseInt(id) }, 'تم حذف المستخدم بنجاح');
});

// @desc    Get all permissions
// @route   GET /api/v1/users/permissions/all
// @access  Private
const getAllPermissions = asyncHandler(async (req, res) => {
  const [permissions] = await db.query(
    'SELECT id, name, description FROM permissions ORDER BY id'
  );

  successResponse(res, { permissions });
});

// @desc    Get all actions
// @route   GET /api/v1/users/actions/all
// @access  Private
const getAllActions = asyncHandler(async (req, res) => {
  const [actions] = await db.query(
    'SELECT id, name, description FROM actions ORDER BY id'
  );

  successResponse(res, { actions });
});

// @desc    Assign permission to user
// @route   POST /api/v1/users/:id/permissions
// @access  Private (requires manage permissions)
const assignPermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actionId, permissionId } = req.body;

  // Validation
  if (!actionId || !permissionId) {
    return errorResponse(res, 'معرف الإجراء والصلاحية مطلوبان', 400);
  }

  // Check if user exists
  const [user] = await db.query(
    'SELECT id FROM users WHERE id = ? AND type = \'user\'',
    [id]
  );

  if (user.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  // Check if permission already exists
  const [existing] = await db.query(
    'SELECT * FROM user_permissions WHERE user_id = ? AND action_id = ? AND permission_id = ?',
    [id, actionId, permissionId]
  );

  if (existing.length > 0) {
    return errorResponse(res, 'الصلاحية موجودة بالفعل', 400);
  }

  // Assign permission
  await db.query(
    'INSERT INTO user_permissions (user_id, action_id, permission_id) VALUES (?, ?, ?)',
    [id, actionId, permissionId]
  );

  successResponse(res, {
    userId: parseInt(id),
    actionId: parseInt(actionId),
    permissionId: parseInt(permissionId)
  }, 'تم منح الصلاحية بنجاح', 201);
});

// @desc    Remove permission from user
// @route   DELETE /api/v1/users/:id/permissions
// @access  Private (requires manage permissions)
const removePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actionId, permissionId } = req.body;

  // Validation
  if (!actionId || !permissionId) {
    return errorResponse(res, 'معرف الإجراء والصلاحية مطلوبان', 400);
  }

  // Remove permission
  const [result] = await db.query(
    'DELETE FROM user_permissions WHERE user_id = ? AND action_id = ? AND permission_id = ?',
    [id, actionId, permissionId]
  );

  if (result.affectedRows === 0) {
    return errorResponse(res, 'الصلاحية غير موجودة', 404);
  }

  successResponse(res, {
    userId: parseInt(id),
    actionId: parseInt(actionId),
    permissionId: parseInt(permissionId)
  }, 'تم سحب الصلاحية بنجاح');
});

// @desc    Bulk assign permissions to user
// @route   POST /api/v1/users/:id/permissions/bulk
// @access  Private (requires manage permissions)
const bulkAssignPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // Array of {actionId, permissionId}

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return errorResponse(res, 'قائمة الصلاحيات مطلوبة', 400);
  }

  // Check if user exists
  const [user] = await db.query(
    'SELECT id FROM users WHERE id = ? AND type = \'user\'',
    [id]
  );

  if (user.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Delete existing permissions
    await connection.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);

    // Insert new permissions
    if (permissions.length > 0) {
      const values = permissions.map(p => [id, p.actionId, p.permissionId]);
      await connection.query(
        'INSERT INTO user_permissions (user_id, action_id, permission_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    successResponse(res, {
      userId: parseInt(id),
      permissionsCount: permissions.length
    }, 'تم تحديث الصلاحيات بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllPermissions,
  getAllActions,
  assignPermission,
  removePermission,
  bulkAssignPermissions
};



