const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

// All audit routes require view_audit_logs permission
router.use(checkPermissionNew('view_audit_logs'));

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs
 * @access  Private (Staff)
 */
router.get('/logs', auditController.getAuditLogs);

/**
 * @route   GET /api/v1/audit/user-activity
 * @desc    Get user activity
 * @access  Private (Staff)
 */
router.get('/user-activity', auditController.getUserActivity);

/**
 * @route   GET /api/v1/audit/unauthorized-attempts
 * @desc    Get unauthorized attempts
 * @access  Private (Staff)
 */
router.get('/unauthorized-attempts', auditController.getUnauthorizedAttempts);

module.exports = router;


