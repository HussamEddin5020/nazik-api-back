const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get all system users (staff only, not customers)
 * @route   GET /api/v1/users-management
 * @access  Private (Staff with view_users permission)
 */
exports.getAllSystemUsers = asyncHandler(async (req, res) => {
  const { search, status, role_id } = req.query;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.type,
      u.status,
      u.created_at,
      u.updated_at,
      GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ') as roles,
      COUNT(DISTINCT ur.role_id) as roles_count
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
    LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
    WHERE u.type = 'user'
  `;
  
  const params = [];
  
  // Search filter
  if (search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // Status filter
  if (status) {
    query += ` AND u.status = ?`;
    params.push(status);
  }
  
  // Role filter
  if (role_id) {
    query += ` AND EXISTS (
      SELECT 1 FROM user_roles ur2 
      WHERE ur2.user_id = u.id AND ur2.role_id = ? AND ur2.is_active = 1
    )`;
    params.push(role_id);
  }
  
  query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  const [users] = await db.query(query, params);
  
  // Get total count
  let countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
    WHERE u.type = 'user'
  `;
  
  const countParams = [];
  
  if (search) {
    countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (status) {
    countQuery += ` AND u.status = ?`;
    countParams.push(status);
  }
  
  if (role_id) {
    countQuery += ` AND EXISTS (
      SELECT 1 FROM user_roles ur2 
      WHERE ur2.user_id = u.id AND ur2.role_id = ? AND ur2.is_active = 1
    )`;
    countParams.push(role_id);
  }
  
  const [countResult] = await db.query(countQuery, countParams);
  
  successResponse(res, {
    users,
    pagination: {
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total: countResult[0].total,
      total_pages: Math.ceil(countResult[0].total / limit)
    }
  });
});

/**
 * @desc    Get user roles
 * @route   GET /api/v1/users/:id/roles
 * @access  Private (Staff with view_users permission)
 */
exports.getUserRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user exists and is staff
  const [users] = await db.query(
    'SELECT id, name, email, phone, type, status FROM users WHERE id = ? AND type = "user"',
    [id]
  );
  
  if (users.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }
  
  // Get user roles
  const [roles] = await db.query(
    `SELECT 
      r.id,
      r.name,
      r.description,
      r.is_active as role_is_active,
      ur.assigned_at,
      ur.assigned_by,
      ur.expires_at,
      ur.is_active,
      u_assigned.name as assigned_by_name,
      COUNT(DISTINCT rp.permission_id) as permissions_count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN users u_assigned ON ur.assigned_by = u_assigned.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
    WHERE ur.user_id = ? AND ur.is_active = 1
    GROUP BY r.id, ur.id
    ORDER BY ur.assigned_at DESC`,
    [id]
  );
  
  // Get all user permissions (from roles)
  const [permissions] = await db.query(
    `SELECT DISTINCT
      p.id,
      p.name,
      p.description,
      p.module,
      p.action,
      r.name as from_role
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id AND rp.is_active = 1
    JOIN new_permissions p ON rp.permission_id = p.id AND p.is_active = 1
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ? AND ur.is_active = 1
    ORDER BY p.module, p.action, p.name`,
    [id]
  );
  
  successResponse(res, {
    user: users[0],
    roles,
    permissions,
    total_permissions: permissions.length
  });
});

/**
 * @desc    Assign roles to user
 * @route   PUT /api/v1/users/:id/roles
 * @access  Private (Staff with manage_users permission)
 */
exports.assignUserRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role_ids = [], expires_at = null } = req.body;
  
  // Check if user exists and is staff
  const [users] = await db.query(
    'SELECT id, name, type FROM users WHERE id = ? AND type = "user"',
    [id]
  );
  
  if (users.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }
  
  // Validate role_ids
  if (!Array.isArray(role_ids) || role_ids.length === 0) {
    return errorResponse(res, 'يجب تحديد دور واحد على الأقل', 400);
  }
  
  // Check if all roles exist
  const [rolesCheck] = await db.query(
    `SELECT id FROM roles WHERE id IN (?) AND is_active = 1`,
    [role_ids]
  );
  
  if (rolesCheck.length !== role_ids.length) {
    return errorResponse(res, 'أحد الأدوار المحددة غير صحيح', 400);
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Deactivate all current roles
    await connection.query(
      'UPDATE user_roles SET is_active = 0 WHERE user_id = ?',
      [id]
    );
    
    // Insert new roles
    const roleValues = role_ids.map(roleId => [
      id,
      roleId,
      req.user.id,
      1,
      expires_at
    ]);
    
    await connection.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by, is_active, expires_at) 
       VALUES ?
       ON DUPLICATE KEY UPDATE 
         is_active = 1,
         assigned_by = VALUES(assigned_by),
         assigned_at = CURRENT_TIMESTAMP,
         expires_at = VALUES(expires_at)`,
      [roleValues]
    );
    
    await connection.commit();
    
    // Get updated roles
    const [updatedRoles] = await connection.query(
      `SELECT 
        r.id,
        r.name,
        r.description,
        ur.assigned_at,
        ur.expires_at,
        COUNT(DISTINCT rp.permission_id) as permissions_count
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
      WHERE ur.user_id = ? AND ur.is_active = 1
      GROUP BY r.id, ur.id`,
      [id]
    );
    
    successResponse(res, {
      user_id: id,
      roles: updatedRoles,
      roles_count: updatedRoles.length
    }, 'تم تعيين الأدوار بنجاح');
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Remove role from user
 * @route   DELETE /api/v1/users/:userId/roles/:roleId
 * @access  Private (Staff with manage_users permission)
 */
exports.removeUserRole = asyncHandler(async (req, res) => {
  const { userId, roleId } = req.params;
  
  // Check if assignment exists
  const [existing] = await db.query(
    'SELECT id FROM user_roles WHERE user_id = ? AND role_id = ? AND is_active = 1',
    [userId, roleId]
  );
  
  if (existing.length === 0) {
    return errorResponse(res, 'الدور غير معين لهذا المستخدم', 404);
  }
  
  // Deactivate role
  await db.query(
    'UPDATE user_roles SET is_active = 0 WHERE user_id = ? AND role_id = ?',
    [userId, roleId]
  );
  
  successResponse(res, null, 'تم إزالة الدور بنجاح');
});

/**
 * @desc    Update user status
 * @route   PUT /api/v1/users/:id/status
 * @access  Private (Staff with manage_users permission)
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['active', 'suspended', 'deleted'];
  if (!validStatuses.includes(status)) {
    return errorResponse(res, 'حالة غير صالحة', 400);
  }
  
  // Check if user exists
  const [users] = await db.query(
    'SELECT id, name, status FROM users WHERE id = ? AND type = "user"',
    [id]
  );
  
  if (users.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود', 404);
  }
  
  // Update status
  await db.query(
    'UPDATE users SET status = ? WHERE id = ?',
    [status, id]
  );
  
  // Log the action
  await db.query(
    `INSERT INTO user_audit_logs (actor_user_id, entity_type, entity_id, action, old_data, new_data)
     VALUES (?, 'user', ?, 'UPDATE_STATUS', ?, ?)`,
    [
      req.user.id,
      id,
      JSON.stringify({ status: users[0].status }),
      JSON.stringify({ status })
    ]
  );
  
  const statusMessages = {
    'active': 'تم تفعيل المستخدم بنجاح',
    'suspended': 'تم تعليق المستخدم بنجاح',
    'deleted': 'تم حذف المستخدم بنجاح'
  };
  
  successResponse(res, { id, status }, statusMessages[status]);
});

