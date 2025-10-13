const db = require('../config/database');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * الحصول على جميع سجلات الأحداث مع فلترة
 */
const getAllAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    actor_type,
    action_type,
    table_name,
    success,
    actor_user_id,
    start_date,
    end_date,
    search
  } = req.query;

  const offset = (page - 1) * limit;
  let whereConditions = [];
  let queryParams = [];

  // بناء شروط الفلترة
  if (actor_type) {
    whereConditions.push('actor_type = ?');
    queryParams.push(actor_type);
  }

  if (action_type) {
    whereConditions.push('action_type = ?');
    queryParams.push(action_type);
  }

  if (table_name) {
    whereConditions.push('table_name = ?');
    queryParams.push(table_name);
  }

  if (success !== undefined) {
    whereConditions.push('success = ?');
    queryParams.push(success === 'true' ? 1 : 0);
  }

  if (actor_user_id) {
    whereConditions.push('actor_user_id = ?');
    queryParams.push(actor_user_id);
  }

  if (start_date) {
    whereConditions.push('created_at >= ?');
    queryParams.push(start_date);
  }

  if (end_date) {
    whereConditions.push('created_at <= ?');
    queryParams.push(end_date);
  }

  if (search) {
    whereConditions.push('(description LIKE ? OR actor_name LIKE ? OR table_name LIKE ?)');
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // الحصول على البيانات
  const [logs] = await db.query(`
    SELECT 
      id,
      actor_user_id,
      actor_type,
      actor_name,
      permission_id,
      action_id,
      permission_name,
      action_name,
      has_permission,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      description,
      success,
      error_message,
      created_at
    FROM unified_audit_log 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...queryParams, parseInt(limit), parseInt(offset)]);

  // الحصول على العدد الإجمالي
  const [countResult] = await db.query(`
    SELECT COUNT(*) as total
    FROM unified_audit_log 
    ${whereClause}
  `, queryParams);

  const total = countResult[0].total;

  res.json(successResponse({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }));
});

/**
 * الحصول على سجلات أحداث معينة (مثل الطلبات)
 */
const getTableAuditLogs = asyncHandler(async (req, res) => {
  const { table_name } = req.params;
  const {
    page = 1,
    limit = 20,
    record_id,
    start_date,
    end_date
  } = req.query;

  const offset = (page - 1) * limit;
  let whereConditions = ['table_name = ?'];
  let queryParams = [table_name];

  if (record_id) {
    whereConditions.push('record_id = ?');
    queryParams.push(record_id);
  }

  if (start_date) {
    whereConditions.push('created_at >= ?');
    queryParams.push(start_date);
  }

  if (end_date) {
    whereConditions.push('created_at <= ?');
    queryParams.push(end_date);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const [logs] = await db.query(`
    SELECT 
      id,
      actor_user_id,
      actor_type,
      actor_name,
      action_type,
      record_id,
      old_values,
      new_values,
      description,
      success,
      created_at
    FROM unified_audit_log 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...queryParams, parseInt(limit), parseInt(offset)]);

  const [countResult] = await db.query(`
    SELECT COUNT(*) as total
    FROM unified_audit_log 
    ${whereClause}
  `, queryParams);

  const total = countResult[0].total;

  res.json(successResponse({
    table_name,
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }));
});

/**
 * الحصول على سجلات مستخدم معين
 */
const getUserAuditLogs = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const {
    page = 1,
    limit = 20,
    action_type,
    table_name,
    start_date,
    end_date
  } = req.query;

  const offset = (page - 1) * limit;
  let whereConditions = ['actor_user_id = ?'];
  let queryParams = [user_id];

  if (action_type) {
    whereConditions.push('action_type = ?');
    queryParams.push(action_type);
  }

  if (table_name) {
    whereConditions.push('table_name = ?');
    queryParams.push(table_name);
  }

  if (start_date) {
    whereConditions.push('created_at >= ?');
    queryParams.push(start_date);
  }

  if (end_date) {
    whereConditions.push('created_at <= ?');
    queryParams.push(end_date);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const [logs] = await db.query(`
    SELECT 
      id,
      actor_type,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      description,
      success,
      created_at
    FROM unified_audit_log 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...queryParams, parseInt(limit), parseInt(offset)]);

  const [countResult] = await db.query(`
    SELECT COUNT(*) as total
    FROM unified_audit_log 
    ${whereClause}
  `, queryParams);

  const total = countResult[0].total;

  res.json(successResponse({
    user_id,
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }));
});

/**
 * الحصول على إحصائيات سجل الأحداث
 */
const getAuditLogStats = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query; // 1d, 7d, 30d, 90d

  let dateFilter = '';
  switch (period) {
    case '1d':
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
      break;
    case '7d':
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      break;
    case '30d':
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case '90d':
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
      break;
  }

  // إحصائيات عامة
  const [totalLogs] = await db.query(`
    SELECT COUNT(*) as total
    FROM unified_audit_log 
    WHERE 1=1 ${dateFilter}
  `);

  // إحصائيات حسب نوع العملية
  const [actionStats] = await db.query(`
    SELECT 
      action_type,
      COUNT(*) as count
    FROM unified_audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY action_type
    ORDER BY count DESC
  `);

  // إحصائيات حسب الجدول
  const [tableStats] = await db.query(`
    SELECT 
      table_name,
      COUNT(*) as count
    FROM unified_audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY table_name
    ORDER BY count DESC
  `);

  // إحصائيات حسب المستخدم
  const [userStats] = await db.query(`
    SELECT 
      actor_user_id,
      actor_name,
      COUNT(*) as count
    FROM unified_audit_log 
    WHERE actor_user_id IS NOT NULL ${dateFilter}
    GROUP BY actor_user_id, actor_name
    ORDER BY count DESC
    LIMIT 10
  `);

  // إحصائيات النجاح/الفشل
  const [successStats] = await db.query(`
    SELECT 
      success,
      COUNT(*) as count
    FROM unified_audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY success
  `);

  res.json(successResponse({
    period,
    total_logs: totalLogs[0].total,
    action_stats: actionStats,
    table_stats: tableStats,
    user_stats: userStats,
    success_stats: successStats
  }));
});

/**
 * الحصول على تفاصيل سجل معين
 */
const getAuditLogDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [logs] = await db.query(`
    SELECT 
      *
    FROM unified_audit_log 
    WHERE id = ?
  `, [id]);

  if (logs.length === 0) {
    return res.status(404).json(errorResponse('سجل الحدث غير موجود', 404));
  }

  res.json(successResponse({
    log: logs[0]
  }));
});

module.exports = {
  getAllAuditLogs,
  getTableAuditLogs,
  getUserAuditLogs,
  getAuditLogStats,
  getAuditLogDetails
};
