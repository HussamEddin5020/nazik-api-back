const express = require('express');
const router = express.Router();
const {
  getAllAuditLogs,
  getTableAuditLogs,
  getUserAuditLogs,
  getAuditLogStats,
  getAuditLogDetails
} = require('../controllers/auditLogs.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/audit-logs
 * @desc    الحصول على جميع سجلات الأحداث مع فلترة
 * @access  Private (view_audit_logs permission)
 */
router.get('/', hasPermission('view_audit_logs'), getAllAuditLogs);

/**
 * @route   GET /api/audit-logs/stats
 * @desc    الحصول على إحصائيات سجل الأحداث
 * @access  Private (view_audit_logs permission)
 */
router.get('/stats', hasPermission('view_audit_logs'), getAuditLogStats);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    الحصول على تفاصيل سجل معين
 * @access  Private (view_audit_logs permission)
 */
router.get('/:id', hasPermission('view_audit_logs'), getAuditLogDetails);

/**
 * @route   GET /api/audit-logs/table/:table_name
 * @desc    الحصول على سجلات أحداث جدول معين
 * @access  Private (view_audit_logs permission)
 */
router.get('/table/:table_name', hasPermission('view_audit_logs'), getTableAuditLogs);

/**
 * @route   GET /api/audit-logs/user/:user_id
 * @desc    الحصول على سجلات مستخدم معين
 * @access  Private (view_audit_logs permission)
 */
router.get('/user/:user_id', hasPermission('view_audit_logs'), getUserAuditLogs);

module.exports = router;
