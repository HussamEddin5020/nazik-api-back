const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions
} = require('../controllers/roles.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private (view_roles permission)
 */
router.get('/', hasPermission('view_roles'), getAllRoles);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get single role by ID
 * @access  Private (view_roles permission)
 */
router.get('/:id', hasPermission('view_roles'), getRoleById);

/**
 * @route   POST /api/v1/roles
 * @desc    Create new role
 * @access  Private (create_roles permission)
 */
router.post('/', hasPermission('create_roles'), createRole);

/**
 * @route   PUT /api/v1/roles/:id
 * @desc    Update role
 * @access  Private (update_roles permission)
 */
router.put('/:id', hasPermission('update_roles'), updateRole);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    Delete role
 * @access  Private (delete_roles permission)
 */
router.delete('/:id', hasPermission('delete_roles'), deleteRole);

/**
 * @route   GET /api/v1/roles/:id/permissions
 * @desc    Get permissions for a role
 * @access  Private (view_roles permission)
 */
router.get('/:id/permissions', hasPermission('view_roles'), getRolePermissions);

/**
 * @route   PUT /api/v1/roles/:id/permissions
 * @desc    Update role permissions
 * @access  Private (manage_roles permission)
 */
router.put('/:id/permissions', hasPermission('manage_roles'), updateRolePermissions);

module.exports = router;
