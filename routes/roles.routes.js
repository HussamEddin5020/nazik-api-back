const express = require('express');
const router = express.Router();
const {
  // Roles
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  
  // Permissions
  getAllPermissions,
  getPermissionModules,
  
  // User Roles
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissions,
  
  // Permission Checking
  checkUserPermission,
  getUserEffectivePermissions
} = require('../controllers/roles.controller');

const { verifyToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// =====================================================
// Routes للأدوار (Roles)
// =====================================================

// Get all roles
router.get('/', 
  verifyToken, 
  checkPermission('manage_permissions'),
  getAllRoles
);

// Get role by ID
router.get('/:id', 
  verifyToken, 
  checkPermission('view_permissions'),
  getRoleById
);

// Create new role
router.post('/', 
  verifyToken, 
  checkPermission('manage_permissions'),
  createRole
);

// Update role
router.put('/:id', 
  verifyToken, 
  checkPermission('manage_permissions'),
  updateRole
);

// Delete role
router.delete('/:id', 
  verifyToken, 
  checkPermission('manage_permissions'),
  deleteRole
);

// =====================================================
// Routes للصلاحيات (Permissions)
// =====================================================

// Get all permissions
router.get('/permissions/all', 
  verifyToken, 
  checkPermission('view_permissions'),
  getAllPermissions
);

// Get permission modules
router.get('/permissions/modules', 
  verifyToken, 
  checkPermission('view_permissions'),
  getPermissionModules
);

// =====================================================
// Routes لأدوار المستخدمين (User Roles)
// =====================================================

// Assign role to user
router.post('/users/:userId/assign', 
  verifyToken, 
  checkPermission('manage_users'),
  assignRoleToUser
);

// Remove role from user
router.delete('/users/:userId/roles/:roleId', 
  verifyToken, 
  checkPermission('manage_users'),
  removeRoleFromUser
);

// Get user roles
router.get('/users/:userId/roles', 
  verifyToken, 
  checkPermission('view_users'),
  getUserRoles
);

// Get user permissions
router.get('/users/:userId/permissions', 
  verifyToken, 
  checkPermission('view_users'),
  getUserPermissions
);

// Check user permission
router.get('/users/:userId/check-permission/:permissionName', 
  verifyToken, 
  checkPermission('view_users'),
  checkUserPermission
);

// Get user effective permissions
router.get('/users/:userId/effective-permissions', 
  verifyToken, 
  checkPermission('view_users'),
  getUserEffectivePermissions
);

module.exports = router;
