const { errorResponse } = require('../utils/helpers');

/**
 * Check if user has specific permission (النظام الجديد)
 * @param {string} permissionName - Permission name (view_orders, manage_users, etc.)
 * @returns {Function} Express middleware
 */
exports.checkPermissionNew = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for super admin or system users with full access
      if (req.user && req.user.type === 'user') {
        // Check permission using the new system
        const db = require('../config/database');
        const [result] = await db.query(
          'SELECT fn_check_user_permission_new(?, ?) as has_permission',
          [req.user.id, permissionName]
        );

        const hasPermission = result[0].has_permission;

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
            code: 'INSUFFICIENT_PERMISSIONS',
            permission_required: permissionName,
            statusCode: 403
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
        statusCode: 500
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions (النظام الجديد)
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
exports.checkAnyPermissionNew = (permissionNames) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.type === 'user') {
        const db = require('../config/database');
        
        // Check each permission
        for (const permissionName of permissionNames) {
          const [result] = await db.query(
            'SELECT fn_check_user_permission_new(?, ?) as has_permission',
            [req.user.id, permissionName]
          );

          if (result[0].has_permission) {
            return next(); // User has at least one permission
          }
        }

        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          code: 'INSUFFICIENT_PERMISSIONS',
          permissions_required: permissionNames,
          statusCode: 403
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
        statusCode: 500
      });
    }
  };
};

/**
 * Check if user has all specified permissions (النظام الجديد)
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
exports.checkAllPermissionsNew = (permissionNames) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.type === 'user') {
        const db = require('../config/database');
        
        // Check all permissions
        for (const permissionName of permissionNames) {
          const [result] = await db.query(
            'SELECT fn_check_user_permission_new(?, ?) as has_permission',
            [req.user.id, permissionName]
          );

          if (!result[0].has_permission) {
            return res.status(403).json({
              success: false,
              message: 'ليس لديك جميع الصلاحيات المطلوبة للوصول إلى هذا المورد',
              code: 'INSUFFICIENT_PERMISSIONS',
              permissions_required: permissionNames,
              missing_permission: permissionName,
              statusCode: 403
            });
          }
        }

        return next(); // User has all permissions
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
        statusCode: 500
      });
    }
  };
};

/**
 * Check if user has permission for specific module (النظام الجديد)
 * @param {string} module - Module name (orders, users, shipments, etc.)
 * @param {string} action - Action name (view, create, update, delete)
 * @returns {Function} Express middleware
 */
exports.checkModulePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.type === 'user') {
        const db = require('../config/database');
        
        // Check if user has permission for this module and action
        const [result] = await db.query(`
          SELECT COUNT(*) > 0 as has_permission
          FROM v_user_permissions
          WHERE user_id = ? AND module = ? AND action = ?
        `, [req.user.id, module, action]);

        if (!result[0].has_permission) {
          return res.status(403).json({
            success: false,
            message: `ليس لديك صلاحية ${action} في وحدة ${module}`,
            code: 'INSUFFICIENT_PERMISSIONS',
            module,
            action,
            statusCode: 403
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
        statusCode: 500
      });
    }
  };
};

/**
 * Check if user is admin (النظام الجديد)
 * @returns {Function} Express middleware
 */
exports.checkAdmin = () => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.type === 'user') {
        const db = require('../config/database');
        
        // Check if user has admin role
        const [result] = await db.query(`
          SELECT COUNT(*) > 0 as is_admin
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = ? 
            AND ur.is_active = TRUE 
            AND r.name = 'مدير النظام'
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        `, [req.user.id]);

        if (!result[0].is_admin) {
          return res.status(403).json({
            success: false,
            message: 'هذا المورد متاح فقط لمديري النظام',
            code: 'ADMIN_REQUIRED',
            statusCode: 403
          });
        }
      }

      next();
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من صلاحيات المدير',
        statusCode: 500
      });
    }
  };
};

/**
 * Get user permissions for frontend (النظام الجديد)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.getUserPermissionsForFrontend = async (req, res, next) => {
  try {
    if (req.user && req.user.type === 'user') {
      const db = require('../config/database');
      
      // Get user permissions
      const [permissions] = await db.query(`
        SELECT DISTINCT p.name, p.module, p.action, p.description
        FROM new_permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ? 
          AND ur.is_active = TRUE 
          AND rp.is_active = TRUE 
          AND p.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ORDER BY p.module, p.action, p.name
      `, [req.user.id]);

      // Add permissions to request object
      req.user.permissions = permissions;
    }

    next();
  } catch (error) {
    console.error('Get user permissions error:', error);
    next(); // Continue even if there's an error
  }
};

// Keep the old functions for backward compatibility
const { checkPermission, checkAnyPermission } = require('./permissionMiddleware');

module.exports = {
  // New system
  checkPermissionNew,
  checkAnyPermissionNew,
  checkAllPermissionsNew,
  checkModulePermission,
  checkAdmin,
  getUserPermissionsForFrontend,
  
  // Old system (for backward compatibility)
  checkPermission,
  checkAnyPermission
};
