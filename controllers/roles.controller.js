const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

// =====================================================
// 1. إدارة الأدوار (Roles)
// =====================================================

/**
 * @desc    Get all roles
 * @route   GET /api/v1/roles
 * @access  Private (Admin)
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT r.*, 
           COUNT(ur.user_id) as users_count,
           COUNT(rp.permission_id) as permissions_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = TRUE
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = TRUE
    WHERE 1=1
  `;
  
  const params = [];

  if (search) {
    query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  if (status !== undefined) {
    query += ' AND r.is_active = ?';
    params.push(status === 'true' ? 1 : 0);
  }

  query += ' GROUP BY r.id ORDER BY r.created_at DESC';

  // Get total count
  const countQuery = query.replace(
    'SELECT r.*, COUNT(ur.user_id) as users_count, COUNT(rp.permission_id) as permissions_count',
    'SELECT COUNT(DISTINCT r.id) as total'
  );
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [roles] = await db.query(query, params);

  successResponse(res, {
    roles,
    pagination: {
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_prev: page > 1
    }
  });
});

/**
 * @desc    Get role by ID
 * @route   GET /api/v1/roles/:id
 * @access  Private (Admin)
 */
exports.getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [roles] = await db.query(`
    SELECT r.*, 
           COUNT(ur.user_id) as users_count,
           COUNT(rp.permission_id) as permissions_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = TRUE
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = TRUE
    WHERE r.id = ?
    GROUP BY r.id
  `, [id]);

  if (roles.length === 0) {
    return errorResponse(res, 'الدور غير موجود', 404);
  }

  // Get role permissions
  const [permissions] = await db.query(`
    SELECT p.*, rp.granted_at
    FROM new_permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ? AND rp.is_active = TRUE AND p.is_active = TRUE
    ORDER BY p.module, p.action
  `, [id]);

  // Get role users
  const [users] = await db.query(`
    SELECT u.id, u.name, u.email, u.type, u.status, ur.assigned_at
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    WHERE ur.role_id = ? AND ur.is_active = TRUE AND u.status = 'active'
    ORDER BY ur.assigned_at DESC
  `, [id]);

  successResponse(res, {
    role: roles[0],
    permissions,
    users
  });
});

/**
 * @desc    Create new role
 * @route   POST /api/v1/roles
 * @access  Private (Admin)
 */
exports.createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name) {
    return errorResponse(res, 'اسم الدور مطلوب', 400);
  }

  // Check if role name already exists
  const [existingRoles] = await db.query(
    'SELECT id FROM roles WHERE name = ?',
    [name]
  );

  if (existingRoles.length > 0) {
    return errorResponse(res, 'اسم الدور موجود بالفعل', 400);
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Create role
    const [result] = await connection.query(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description]
    );

    const roleId = result.insertId;

    // Add permissions to role
    if (permissions && permissions.length > 0) {
      const permissionValues = permissions.map(permissionId => [roleId, permissionId]);
      await connection.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [permissionValues]
      );
    }

    await connection.commit();

    successResponse(res, {
      role_id: roleId,
      message: 'تم إنشاء الدور بنجاح'
    });

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
 * @access  Private (Admin)
 */
exports.updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Update role
    await connection.query(
      'UPDATE roles SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    // Update permissions
    if (permissions !== undefined) {
      // Remove existing permissions
      await connection.query(
        'UPDATE role_permissions SET is_active = FALSE WHERE role_id = ?',
        [id]
      );

      // Add new permissions
      if (permissions.length > 0) {
        const permissionValues = permissions.map(permissionId => [id, permissionId]);
        await connection.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
          [permissionValues]
        );
      }
    }

    await connection.commit();

    successResponse(res, {
      message: 'تم تحديث الدور بنجاح'
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Delete role
 * @route   DELETE /api/v1/roles/:id
 * @access  Private (Admin)
 */
exports.deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if role is assigned to any users
  const [users] = await db.query(
    'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ? AND is_active = TRUE',
    [id]
  );

  if (users[0].count > 0) {
    return errorResponse(res, 'لا يمكن حذف الدور لأنه مُعين لمستخدمين', 400);
  }

  // Soft delete role
  await db.query(
    'UPDATE roles SET is_active = FALSE WHERE id = ?',
    [id]
  );

  successResponse(res, {
    message: 'تم حذف الدور بنجاح'
  });
});

// =====================================================
// 2. إدارة الصلاحيات (Permissions)
// =====================================================

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/permissions
 * @access  Private (Admin)
 */
exports.getAllPermissions = asyncHandler(async (req, res) => {
  const { module, action, search } = req.query;

  let query = 'SELECT * FROM new_permissions WHERE is_active = TRUE';
  const params = [];

  if (module) {
    query += ' AND module = ?';
    params.push(module);
  }

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY module, action, name';

  const [permissions] = await db.query(query, params);

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  successResponse(res, {
    permissions: groupedPermissions,
    total: permissions.length
  });
});

/**
 * @desc    Get permission modules
 * @route   GET /api/v1/permissions/modules
 * @access  Private (Admin)
 */
exports.getPermissionModules = asyncHandler(async (req, res) => {
  const [modules] = await db.query(`
    SELECT DISTINCT module, COUNT(*) as permissions_count
    FROM new_permissions 
    WHERE is_active = TRUE
    GROUP BY module
    ORDER BY module
  `);

  successResponse(res, { modules });
});

// =====================================================
// 3. إدارة أدوار المستخدمين (User Roles)
// =====================================================

/**
 * @desc    Assign role to user
 * @route   POST /api/v1/users/:userId/roles
 * @access  Private (Admin)
 */
exports.assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roleId, expiresAt } = req.body;

  if (!roleId) {
    return errorResponse(res, 'معرف الدور مطلوب', 400);
  }

  // Check if user exists
  const [users] = await db.query(
    'SELECT id FROM users WHERE id = ? AND status = "active"',
    [userId]
  );

  if (users.length === 0) {
    return errorResponse(res, 'المستخدم غير موجود أو غير نشط', 404);
  }

  // Check if role exists
  const [roles] = await db.query(
    'SELECT id FROM roles WHERE id = ? AND is_active = TRUE',
    [roleId]
  );

  if (roles.length === 0) {
    return errorResponse(res, 'الدور غير موجود أو غير نشط', 404);
  }

  // Assign role using stored procedure
  await db.query(
    'CALL sp_assign_role_to_user(?, ?, ?)',
    [userId, roleId, req.user.id]
  );

  successResponse(res, {
    message: 'تم تعيين الدور للمستخدم بنجاح'
  });
});

/**
 * @desc    Remove role from user
 * @route   DELETE /api/v1/users/:userId/roles/:roleId
 * @access  Private (Admin)
 */
exports.removeRoleFromUser = asyncHandler(async (req, res) => {
  const { userId, roleId } = req.params;

  // Remove role using stored procedure
  await db.query(
    'CALL sp_remove_role_from_user(?, ?)',
    [userId, roleId]
  );

  successResponse(res, {
    message: 'تم إزالة الدور من المستخدم بنجاح'
  });
});

/**
 * @desc    Get user roles
 * @route   GET /api/v1/users/:userId/roles
 * @access  Private (Admin)
 */
exports.getUserRoles = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [roles] = await db.query(`
    SELECT r.*, ur.assigned_at, ur.expires_at, ur.is_active,
           u.name as assigned_by_name
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    LEFT JOIN users u ON ur.assigned_by = u.id
    WHERE ur.user_id = ?
    ORDER BY ur.assigned_at DESC
  `, [userId]);

  successResponse(res, { roles });
});

/**
 * @desc    Get user permissions
 * @route   GET /api/v1/users/:userId/permissions
 * @access  Private (Admin)
 */
exports.getUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [permissions] = await db.query(`
    SELECT DISTINCT p.*, r.name as role_name
    FROM new_permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ? 
      AND ur.is_active = TRUE 
      AND rp.is_active = TRUE 
      AND p.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY p.module, p.action, p.name
  `, [userId]);

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  successResponse(res, {
    permissions: groupedPermissions,
    total: permissions.length
  });
});

// =====================================================
// 4. التحقق من الصلاحيات (Permission Checking)
// =====================================================

/**
 * @desc    Check user permission
 * @route   GET /api/v1/users/:userId/check-permission/:permissionName
 * @access  Private (Admin)
 */
exports.checkUserPermission = asyncHandler(async (req, res) => {
  const { userId, permissionName } = req.params;

  const hasPermission = await db.query(
    'SELECT fn_check_user_permission_new(?, ?) as has_permission',
    [userId, permissionName]
  );

  successResponse(res, {
    user_id: userId,
    permission: permissionName,
    has_permission: hasPermission[0][0].has_permission
  });
});

/**
 * @desc    Get user effective permissions
 * @route   GET /api/v1/users/:userId/effective-permissions
 * @access  Private (Admin)
 */
exports.getUserEffectivePermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [permissions] = await db.query(`
    SELECT DISTINCT p.name, p.module, p.action, p.description
    FROM new_permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ? 
      AND ur.is_active = TRUE 
      AND rp.is_active = TRUE 
      AND p.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY p.module, p.action, p.name
  `, [userId]);

  successResponse(res, { permissions });
});
