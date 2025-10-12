const { errorResponse } = require('../utils/responseHelper');

/**
 * Check if user has specific permission
 * @param {string} permissionName - Permission name (view, add, update, delete, etc.)
 * @returns {Function} Express middleware
 */
exports.checkPermission = (permissionName) => {
  return (req, res, next) => {
    // Skip permission check for super admin or system users with full access
    if (req.user && req.user.type === 'user') {
      // Get user permissions from req.user (set by authMiddleware)
      const permissions = req.user.permissions || [];

      // Check if user has the required permission
      const hasPermission = permissions.some(
        p => p.permission_name === permissionName || p.permission_name === 'all'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403
        });
      }
    }

    next();
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
exports.checkAnyPermission = (permissionNames) => {
  return (req, res, next) => {
    if (req.user && req.user.type === 'user') {
      const permissions = req.user.permissions || [];

      const hasAnyPermission = permissions.some(
        p => permissionNames.includes(p.permission_name) || p.permission_name === 'all'
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403
        });
      }
    }

    next();
  };
};

/**
 * Check if user has all of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
exports.checkAllPermissions = (permissionNames) => {
  return (req, res, next) => {
    if (req.user && req.user.type === 'user') {
      const permissions = req.user.permissions || [];
      const userPermissionNames = permissions.map(p => p.permission_name);

      const hasAllPermissions = permissionNames.every(
        name => userPermissionNames.includes(name) || userPermissionNames.includes('all')
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحيات كافية للوصول إلى هذا المورد',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403
        });
      }
    }

    next();
  };
};

