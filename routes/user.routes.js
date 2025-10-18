const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

// تم إزالة routes النظام القديم للصلاحيات
// استخدم /api/v1/roles/permissions/all بدلاً من ذلك

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private (Staff with view_users permission)
 */
router.get('/', checkPermissionNew('view_users'), userController.getAllUsers);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Staff with create_users permission)
 */
router.post('/', checkPermissionNew('create_users'), userController.createUser);

/**
 * @route   GET /api/v1/users/:id/permissions
 * @desc    Get user permissions
 * @access  Private (Staff)
 */
router.get('/:id/permissions', userController.getUserPermissions);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (Staff)
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (Staff)
 */
router.put('/:id', userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Private (Staff)
 */
router.delete('/:id', userController.deleteUser);

/**
 * @route   PUT /api/v1/users/:id/permissions
 * @desc    Update user permissions
 * @access  Private (Staff)
 */
router.put('/:id/permissions', userController.updateUserPermissions);

module.exports = router;


