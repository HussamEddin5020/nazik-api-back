const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/users/permissions/list
 * @desc    Get all permissions
 * @access  Private (Staff)
 */
router.get('/permissions/list', userController.getAllPermissions);

/**
 * @route   GET /api/v1/users/actions/list
 * @desc    Get all actions
 * @access  Private (Staff)
 */
router.get('/actions/list', userController.getAllActions);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private (Staff)
 */
router.get('/', userController.getAllUsers);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Staff)
 */
router.post('/', userController.createUser);

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


