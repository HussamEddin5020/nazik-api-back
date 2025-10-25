const express = require('express');
const router = express.Router();
const {
  getAllPermissions,
  getPermissionsGrouped,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getModules,
  getActions
} = require('../controllers/permissions.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/permissions/grouped
 * @desc    Get permissions grouped by module
 * @access  Private (view_permissions permission)
 */
router.get('/grouped', hasPermission('view_permissions'), getPermissionsGrouped);

/**
 * @route   GET /api/v1/permissions/modules
 * @desc    Get available modules
 * @access  Private (Staff)
 */
router.get('/modules', getModules);

/**
 * @route   GET /api/v1/permissions/actions
 * @desc    Get available actions
 * @access  Private (Staff)
 */
router.get('/actions', getActions);

/**
 * @route   GET /api/v1/permissions
 * @desc    Get all permissions
 * @access  Private (view_permissions permission)
 */
router.get('/', hasPermission('view_permissions'), getAllPermissions);

/**
 * @route   GET /api/v1/permissions/:id
 * @desc    Get single permission by ID
 * @access  Private (view_permissions permission)
 */
router.get('/:id', hasPermission('view_permissions'), getPermissionById);

/**
 * @route   POST /api/v1/permissions
 * @desc    Create new permission
 * @access  Private (manage_permissions permission)
 */
router.post('/', hasPermission('manage_permissions'), createPermission);

/**
 * @route   PUT /api/v1/permissions/:id
 * @desc    Update permission
 * @access  Private (manage_permissions permission)
 */
router.put('/:id', hasPermission('manage_permissions'), updatePermission);

/**
 * @route   DELETE /api/v1/permissions/:id
 * @desc    Delete permission
 * @access  Private (manage_permissions permission)
 */
router.delete('/:id', hasPermission('manage_permissions'), deletePermission);

module.exports = router;





