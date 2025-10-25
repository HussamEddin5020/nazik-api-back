const express = require('express');
const router = express.Router();
const {
  getAllSystemUsers,
  getUserRoles,
  assignUserRoles,
  removeUserRole,
  updateUserStatus
} = require('../controllers/userRoles.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/users-management
 * @desc    Get all system users (staff)
 * @access  Private (view_users permission)
 */
router.get('/', hasPermission('view_users'), getAllSystemUsers);

/**
 * @route   GET /api/v1/users-management/:id/roles
 * @desc    Get user roles
 * @access  Private (view_users permission)
 */
router.get('/:id/roles', hasPermission('view_users'), getUserRoles);

/**
 * @route   PUT /api/v1/users-management/:id/roles
 * @desc    Assign roles to user
 * @access  Private (manage_users permission)
 */
router.put('/:id/roles', hasPermission('manage_users'), assignUserRoles);

/**
 * @route   DELETE /api/v1/users-management/:userId/roles/:roleId
 * @desc    Remove role from user
 * @access  Private (manage_users permission)
 */
router.delete('/:userId/roles/:roleId', hasPermission('manage_users'), removeUserRole);

/**
 * @route   PUT /api/v1/users-management/:id/status
 * @desc    Update user status
 * @access  Private (manage_users permission)
 */
router.put('/:id/status', hasPermission('manage_users'), updateUserStatus);

module.exports = router;





