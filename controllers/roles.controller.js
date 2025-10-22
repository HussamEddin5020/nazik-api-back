const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get all roles
 * @route   GET /api/v1/roles
 * @access  Private (Staff with manage_roles permission)
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const { search, is_active } = req.query;
  
  let query = `
    SELECT 
      r.id,
      r.name,
      r.description,
      r.is_active,
      r.created_at,
      r.updated_at,
      COUNT(DISTINCT ur.user_id) as users_count,
      COUNT(DISTINCT rp.permission_id) as permissions_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
    WHERE 1=1
  `;
  
  const params = [];
  
  // Search filter
  if (search) {
    query += ` AND (r.name LIKE ? OR r.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  // Active filter
  if (is_active !== undefined) {
    query += ` AND r.is_active = ?`;
    params.push(is_active);
  }
  
  query += ` GROUP BY r.id ORDER BY r.id DESC`;
  
  const [roles] = await db.query(query, params);
  
  successResponse(res, {
    roles,
    total: roles.length
  });
});

/**
 * @desc    Get single role by ID
 * @route   GET /api/v1/roles/:id
 * @access  Private (Staff with view_roles permission)
 */
exports.getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get role details
  const [roles] = await db.query(
    `SELECT 
      r.id,
      r.name,
      r.description,
      r.is_active,
      r.created_at,
      r.updated_at,
      COUNT(DISTINCT ur.user_id) as users_count,
      COUNT(DISTINCT rp.permission_id) as permissions_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
    WHERE r.id = ?
    GROUP BY r.id`,
    [id]
  );
  
  if (roles.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }
  
  // Get permissions for this role
  const [permissions] = await db.query(
    `SELECT 
      p.id,
      p.name,
      p.description,
      p.module,
      p.action,
      rp.granted_at,
      rp.is_active
    FROM role_permissions rp
    JOIN new_permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ? AND rp.is_active = 1
    ORDER BY p.module, p.action`,
    [id]
  );
  
  // Get users with this role
  const [users] = await db.query(
    `SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      ur.assigned_at,
      ur.expires_at
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role_id = ? AND ur.is_active = 1
    ORDER BY ur.assigned_at DESC`,
    [id]
  );
  
  successResponse(res, {
    role: roles[0],
    permissions,
    users
  });
});

/**
 * @desc    Create new role
 * @route   POST /api/v1/roles
 * @access  Private (Staff with create_roles permission)
 */
exports.createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions = [] } = req.body;
  
  // Validation
  if (!name) {
    return errorResponse(res, 'اسم الدور مطلوب', 400);
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if role name already exists
    const [existing] = await connection.query(
      'SELECT id FROM roles WHERE name = ?',
      [name]
    );
    
    if (existing.length > 0) {
      await connection.rollback();
      return errorResponse(res, 'اسم الدور موجود بالفعل', 400);
    }
    
    // Insert role
    const [result] = await connection.query(
      'INSERT INTO roles (name, description, is_active) VALUES (?, ?, 1)',
      [name, description || null]
    );
    
    const roleId = result.insertId;
    
    // Insert permissions if provided
    if (permissions.length > 0) {
      const permissionValues = permissions.map(permId => [
        roleId,
        permId,
        req.user.id,
        1
      ]);
      
      await connection.query(
        `INSERT INTO role_permissions (role_id, permission_id, granted_by, is_active) 
         VALUES ?`,
        [permissionValues]
      );
    }
    
    await connection.commit();
    
    // Get created role with permissions
    const [newRole] = await connection.query(
      `SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        COUNT(DISTINCT rp.permission_id) as permissions_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
      WHERE r.id = ?
      GROUP BY r.id`,
      [roleId]
    );
    
    successResponse(res, newRole[0], 'تم إنشاء الدور بنجاح', 201);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Update role
 * @route   PUT /api/v1/roles/:id
 * @access  Private (Staff with update_roles permission)
 */
exports.updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  
  // Check if role exists
  const [existing] = await db.query('SELECT id FROM roles WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    // Check name uniqueness
    const [duplicate] = await db.query(
      'SELECT id FROM roles WHERE name = ? AND id != ?',
      [name, id]
    );
    
    if (duplicate.length > 0) {
      return errorResponse(res, 'اسم الدور موجود بالفعل', 400);
    }
    
    updates.push('name = ?');
    params.push(name);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return errorResponse(res, 'لا توجد بيانات للتحديث', 400);
  }
  
  params.push(id);
  
  await db.query(
    `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
  
  // Get updated role
  const [updatedRole] = await db.query(
    `SELECT 
      r.id,
      r.name,
      r.description,
      r.is_active,
      r.created_at,
      r.updated_at,
      COUNT(DISTINCT ur.user_id) as users_count,
      COUNT(DISTINCT rp.permission_id) as permissions_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
    WHERE r.id = ?
    GROUP BY r.id`,
    [id]
  );
  
  successResponse(res, updatedRole[0], 'تم تحديث الدور بنجاح');
});

/**
 * @desc    Delete role
 * @route   DELETE /api/v1/roles/:id
 * @access  Private (Staff with delete_roles permission)
 */
exports.deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if role exists
  const [existing] = await db.query('SELECT id, name FROM roles WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }
  
  // Check if role has users
  const [users] = await db.query(
    'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ? AND is_active = 1',
    [id]
  );
  
  if (users[0].count > 0) {
    return errorResponse(
      res,
      `لا يمكن حذف الدور لأنه معين لـ ${users[0].count} مستخدم. قم بإزالة الدور من المستخدمين أولاً.`,
      400
    );
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Delete role permissions
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    // Delete role
    await connection.query('DELETE FROM roles WHERE id = ?', [id]);
    
    await connection.commit();
    
    successResponse(res, null, 'تم حذف الدور بنجاح');
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get permissions for a role
 * @route   GET /api/v1/roles/:id/permissions
 * @access  Private (Staff with view_roles permission)
 */
exports.getRolePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if role exists
  const [roleCheck] = await db.query('SELECT id, name FROM roles WHERE id = ?', [id]);
  
  if (roleCheck.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }
  
  // Get permissions for this role
  const [permissions] = await db.query(
    `SELECT 
      p.id,
      p.name,
      p.description,
      p.module,
      p.action,
      p.is_active,
      rp.granted_at,
      rp.is_active as assigned
    FROM new_permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ? AND rp.is_active = 1
    WHERE p.is_active = 1
    ORDER BY p.module, p.action, p.name`,
    [id]
  );
  
  // Group by module
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});
  
  successResponse(res, {
    role: roleCheck[0],
    permissions,
    grouped
  });
});

/**
 * @desc    Update role permissions
 * @route   PUT /api/v1/roles/:id/permissions
 * @access  Private (Staff with manage_roles permission)
 */
exports.updateRolePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions = [] } = req.body;
  
  // Check if role exists
  const [roleCheck] = await db.query('SELECT id FROM roles WHERE id = ?', [id]);
  
  if (roleCheck.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Delete existing permissions
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    // Insert new permissions
    if (permissions.length > 0) {
      const permissionValues = permissions.map(permId => [
        id,
        permId,
        req.user.id,
        1
      ]);
      
      await connection.query(
        `INSERT INTO role_permissions (role_id, permission_id, granted_by, is_active) 
         VALUES ?`,
        [permissionValues]
      );
    }
    
    await connection.commit();
    
    // Get updated count
    const [updated] = await connection.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ? AND is_active = 1',
      [id]
    );
    
    successResponse(res, {
      role_id: id,
      permissions_count: updated[0].count
    }, 'تم تحديث صلاحيات الدور بنجاح');
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
