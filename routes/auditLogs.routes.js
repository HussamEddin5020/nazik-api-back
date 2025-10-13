const express = require('express');
const router = express.Router();
const {
  getAllAuditLogs,
  getTableAuditLogs,
  getUserAuditLogs,
  getAuditLogStats,
  getAuditLogDetails
} = require('../controllers/auditLogs.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');

// جميع الـ routes تتطلب مصادقة وصلاحية عرض سجلات الأحداث
router.use(authenticateToken);
router.use(checkPermission('manage_audit'));

/**
 * @route   GET /api/audit-logs
 * @desc    الحصول على جميع سجلات الأحداث مع فلترة
 * @access  Private (Admin only)
 */
router.get('/', getAllAuditLogs);

/**
 * @route   GET /api/audit-logs/stats
 * @desc    الحصول على إحصائيات سجل الأحداث
 * @access  Private (Admin only)
 */
router.get('/stats', getAuditLogStats);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    الحصول على تفاصيل سجل معين
 * @access  Private (Admin only)
 */
router.get('/:id', getAuditLogDetails);

/**
 * @route   GET /api/audit-logs/table/:table_name
 * @desc    الحصول على سجلات أحداث جدول معين
 * @access  Private (Admin only)
 */
router.get('/table/:table_name', getTableAuditLogs);

/**
 * @route   GET /api/audit-logs/user/:user_id
 * @desc    الحصول على سجلات مستخدم معين
 * @access  Private (Admin only)
 */
router.get('/user/:user_id', getUserAuditLogs);

module.exports = router;
