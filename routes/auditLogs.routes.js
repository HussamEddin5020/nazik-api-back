const express = require('express');
const router = express.Router();
const {
  getAllAuditLogs,
  getTableAuditLogs,
  getUserAuditLogs,
  getAuditLogStats,
  getAuditLogDetails
} = require('../controllers/auditLogs.controller');
const { verifyToken } = require('../middleware/auth');

// جميع الـ routes تتطلب مصادقة فقط (للمستخدمين النظاميين)
// يمكن إضافة فحص صلاحيات محدد لاحقاً
router.use(verifyToken);

// Middleware للتحقق من أن المستخدم هو من نوع "user" وليس "customer"
router.use((req, res, next) => {
  if (req.user && req.user.type === 'user') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'ليس لديك صلاحية للوصول إلى سجلات الأحداث',
    code: 'INSUFFICIENT_PERMISSIONS',
    statusCode: 403
  });
});

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
