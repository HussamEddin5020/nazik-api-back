const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, getPagination, buildPaginationResponse } = require('../utils/helpers');

/**
 * @desc    Get audit logs
 * @route   GET /api/v1/audit/logs
 * @access  Private (Staff)
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, table_name, action_type, actor_user_id } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  let query = 'SELECT * FROM v_audit_log_detailed WHERE 1=1';
  const params = [];

  if (table_name) {
    query += ' AND table_name = ?';
    params.push(table_name);
  }

  if (action_type) {
    query += ' AND action_type = ?';
    params.push(action_type);
  }

  if (actor_user_id) {
    query += ' AND actor_user_id = ?';
    params.push(actor_user_id);
  }

  // Get total
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination
  query += ' LIMIT ? OFFSET ?';
  params.push(pageLimit, offset);

  const [logs] = await db.query(query, params);

  successResponse(res, buildPaginationResponse(logs, page, limit, total));
});

/**
 * @desc    Get user activity
 * @route   GET /api/v1/audit/user-activity
 * @access  Private (Staff)
 */
exports.getUserActivity = asyncHandler(async (req, res) => {
  const [activity] = await db.query('SELECT * FROM v_user_activity');

  successResponse(res, activity);
});

/**
 * @desc    Get unauthorized attempts
 * @route   GET /api/v1/audit/unauthorized-attempts
 * @access  Private (Staff)
 */
exports.getUnauthorizedAttempts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const { limit: pageLimit, offset } = getPagination(page, limit);

  const [attempts] = await db.query(
    `SELECT * FROM v_unauthorized_attempts
     LIMIT ? OFFSET ?`,
    [pageLimit, offset]
  );

  // Get total
  const [countResult] = await db.query(
    'SELECT COUNT(*) as total FROM v_unauthorized_attempts'
  );

  successResponse(res, buildPaginationResponse(attempts, page, limit, countResult[0].total));
});

module.exports = exports;


