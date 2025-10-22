const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/permissions
 * @access  Private (Staff with view_permissions permission)
 */
exports.getAllPermissions = asyncHandler(async (req, res) => {
  const { search, module, action, is_active } = req.query;
  
  let query = `
    SELECT 
      id,
      name,
      description,
      module,
      action,
      is_active,
      created_at,
      updated_at
    FROM new_permissions
    WHERE 1=1
  `;
  
  const params = [];
  
  // Search filter
  if (search) {
    query += ` AND (name LIKE ? OR description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  // Module filter
  if (module) {
    query += ` AND module = ?`;
    params.push(module);
  }
  
  // Action filter
  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  
  // Active filter
  if (is_active !== undefined) {
    query += ` AND is_active = ?`;
    params.push(is_active);
  }
  
  query += ` ORDER BY module, action, name`;
  
  const [permissions] = await db.query(query, params);
  
  successResponse(res, {
    permissions,
    total: permissions.length
  });
});

/**
 * @desc    Get permissions grouped by module
 * @route   GET /api/v1/permissions/grouped
 * @access  Private (Staff with view_permissions permission)
 */
exports.getPermissionsGrouped = asyncHandler(async (req, res) => {
  const [permissions] = await db.query(
    `SELECT 
      id,
      name,
      description,
      module,
      action,
      is_active
    FROM new_permissions
    WHERE is_active = 1
    ORDER BY module, action, name`
  );
  
  // Group by module
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});
  
  // Convert to array format
  const modules = Object.keys(grouped).map(moduleName => ({
    module: moduleName,
    permissions: grouped[moduleName],
    count: grouped[moduleName].length
  }));
  
  successResponse(res, {
    modules,
    total: permissions.length
  });
});

/**
 * @desc    Get single permission by ID
 * @route   GET /api/v1/permissions/:id
 * @access  Private (Staff with view_permissions permission)
 */
exports.getPermissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const [permissions] = await db.query(
    `SELECT 
      p.id,
      p.name,
      p.description,
      p.module,
      p.action,
      p.is_active,
      p.created_at,
      p.updated_at,
      COUNT(DISTINCT rp.role_id) as roles_count
    FROM new_permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.is_active = 1
    WHERE p.id = ?
    GROUP BY p.id`,
    [id]
  );
  
  if (permissions.length === 0) {
    return errorResponse(res, 'الصلاحية غير موجودة', 404);
  }
  
  // Get roles with this permission
  const [roles] = await db.query(
    `SELECT 
      r.id,
      r.name,
      r.description,
      rp.granted_at
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE rp.permission_id = ? AND rp.is_active = 1
    ORDER BY r.name`,
    [id]
  );
  
  successResponse(res, {
    permission: permissions[0],
    roles
  });
});

/**
 * @desc    Create new permission
 * @route   POST /api/v1/permissions
 * @access  Private (Staff with manage_permissions permission)
 */
exports.createPermission = asyncHandler(async (req, res) => {
  const { name, description, module, action } = req.body;
  
  // Validation
  if (!name || !module || !action) {
    return errorResponse(res, 'الاسم والوحدة والإجراء مطلوبة', 400);
  }
  
  // Check if permission name already exists
  const [existing] = await db.query(
    'SELECT id FROM new_permissions WHERE name = ?',
    [name]
  );
  
  if (existing.length > 0) {
    return errorResponse(res, 'اسم الصلاحية موجود بالفعل', 400);
  }
  
  // Insert permission
  const [result] = await db.query(
    `INSERT INTO new_permissions (name, description, module, action, is_active) 
     VALUES (?, ?, ?, ?, 1)`,
    [name, description || null, module, action]
  );
  
  // Get created permission
  const [newPermission] = await db.query(
    'SELECT * FROM new_permissions WHERE id = ?',
    [result.insertId]
  );
  
  successResponse(res, newPermission[0], 'تم إنشاء الصلاحية بنجاح', 201);
});

/**
 * @desc    Update permission
 * @route   PUT /api/v1/permissions/:id
 * @access  Private (Staff with manage_permissions permission)
 */
exports.updatePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, module, action, is_active } = req.body;
  
  // Check if permission exists
  const [existing] = await db.query(
    'SELECT id FROM new_permissions WHERE id = ?',
    [id]
  );
  
  if (existing.length === 0) {
    return errorResponse(res, 'الصلاحية غير موجودة', 404);
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    // Check name uniqueness
    const [duplicate] = await db.query(
      'SELECT id FROM new_permissions WHERE name = ? AND id != ?',
      [name, id]
    );
    
    if (duplicate.length > 0) {
      return errorResponse(res, 'اسم الصلاحية موجود بالفعل', 400);
    }
    
    updates.push('name = ?');
    params.push(name);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (module !== undefined) {
    updates.push('module = ?');
    params.push(module);
  }
  
  if (action !== undefined) {
    updates.push('action = ?');
    params.push(action);
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
    `UPDATE new_permissions SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
  
  // Get updated permission
  const [updatedPermission] = await db.query(
    'SELECT * FROM new_permissions WHERE id = ?',
    [id]
  );
  
  successResponse(res, updatedPermission[0], 'تم تحديث الصلاحية بنجاح');
});

/**
 * @desc    Delete permission
 * @route   DELETE /api/v1/permissions/:id
 * @access  Private (Staff with manage_permissions permission)
 */
exports.deletePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if permission exists
  const [existing] = await db.query(
    'SELECT id, name FROM new_permissions WHERE id = ?',
    [id]
  );
  
  if (existing.length === 0) {
    return errorResponse(res, 'الصلاحية غير موجودة', 404);
  }
  
  // Check if permission is used by any role
  const [roles] = await db.query(
    'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ? AND is_active = 1',
    [id]
  );
  
  if (roles[0].count > 0) {
    return errorResponse(
      res,
      `لا يمكن حذف الصلاحية لأنها مستخدمة في ${roles[0].count} دور. قم بإزالة الصلاحية من الأدوار أولاً.`,
      400
    );
  }
  
  // Delete permission
  await db.query('DELETE FROM new_permissions WHERE id = ?', [id]);
  
  successResponse(res, null, 'تم حذف الصلاحية بنجاح');
});

/**
 * @desc    Get available modules
 * @route   GET /api/v1/permissions/modules
 * @access  Private (Staff)
 */
exports.getModules = asyncHandler(async (req, res) => {
  const [modules] = await db.query(
    `SELECT DISTINCT module, COUNT(*) as permissions_count
     FROM new_permissions
     WHERE is_active = 1
     GROUP BY module
     ORDER BY module`
  );
  
  successResponse(res, { modules });
});

/**
 * @desc    Get available actions
 * @route   GET /api/v1/permissions/actions
 * @access  Private (Staff)
 */
exports.getActions = asyncHandler(async (req, res) => {
  const [actions] = await db.query(
    `SELECT DISTINCT action, COUNT(*) as permissions_count
     FROM new_permissions
     WHERE is_active = 1
     GROUP BY action
     ORDER BY action`
  );
  
  successResponse(res, { actions });
});

