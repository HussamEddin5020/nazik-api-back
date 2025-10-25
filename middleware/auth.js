const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  try {
    console.log('🔍 verifyToken - URL:', req.originalUrl);
    console.log('🔍 verifyToken - Method:', req.method);
    
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('🔍 verifyToken - Auth header exists:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ verifyToken - No valid auth header');
      return res.status(401).json({
        success: false,
        message: 'لا يوجد رمز تفويض. الرجاء تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    console.log('🔍 verifyToken - Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 verifyToken - Token decoded:', decoded);
    
    // Get user from database
    console.log('🔍 verifyToken - Querying user from database, ID:', decoded.userId);
    const [users] = await db.query(
      `SELECT id, name, email, phone, type, status 
       FROM users 
       WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );
    
    console.log('🔍 verifyToken - Database query result:', users);

    if (users.length === 0) {
      console.log('❌ verifyToken - User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو معطل'
      });
    }

    // Get user permissions if user is staff (النظام الجديد)
    let permissions = [];
    if (users[0].type === 'user') {
      const [userPermissions] = await db.query(
        `SELECT 
          np.id as permission_id,
          np.name as permission_name,
          np.module,
          np.action,
          r.name as role_name
         FROM v_user_permissions vup
         JOIN new_permissions np ON vup.permission_id = np.id
         JOIN roles r ON vup.role_name = r.name
         WHERE vup.user_id = ?`,
        [decoded.userId]
      );
      permissions = userPermissions;
    }

    // Attach user to request
    req.user = {
      ...users[0],
      permissions
    };
    
    console.log('🔍 verifyToken - User authenticated:', req.user.id, req.user.type);
    console.log('🔍 verifyToken - User permissions count:', permissions.length);
    
    // Set session variables for database triggers
    await db.query('SET @current_user_id = ?', [req.user.id]);
    await db.query('SET @current_user_type = ?', [req.user.type]);
    
    console.log('✅ verifyToken - User authenticated:', req.user);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز التفويض غير صالح'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية رمز التفويض. الرجاء تسجيل الدخول مجدداً'
      });
    }

    next(error);
  }
};

// Check if user is staff (type = 'user')
const isStaff = (req, res, next) => {
  console.log('🔍 isStaff middleware - User ID:', req.user?.id);
  console.log('🔍 isStaff middleware - User type:', req.user?.type);
  console.log('🔍 isStaff middleware - User name:', req.user?.name);
  
  if (req.user.type !== 'user') {
    console.log('❌ isStaff middleware - User is not staff, type:', req.user.type);
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذا المورد. مخصص للموظفين فقط'
    });
  }
  
  console.log('✅ isStaff middleware - User is staff, proceeding...');
  next();
};

// Check if user is customer
const isCustomer = (req, res, next) => {
  if (req.user.type !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذا المورد. مخصص للعملاء فقط'
    });
  }
  next();
};

// Check specific permission (النظام الجديد)
const hasPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Customers have limited permissions
      if (req.user.type === 'customer') {
        return next();
      }

      // Check if user has permission using new system
      const [permissions] = await db.query(
        `SELECT COUNT(*) as count
         FROM v_user_permissions
         WHERE user_id = ? 
         AND permission_name = ?`,
        [req.user.id, permissionName]
      );

      if (permissions[0].count === 0) {
        return res.status(403).json({
          success: false,
          message: `ليس لديك صلاحية ${permissionName}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user has any of the specified permissions
const hasAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Customers have limited permissions
      if (req.user.type === 'customer') {
        return next();
      }

      // Check if user has any of the specified permissions
      const placeholders = permissionNames.map(() => '?').join(',');
      const [permissions] = await db.query(
        `SELECT COUNT(*) as count
         FROM v_user_permissions
         WHERE user_id = ? 
         AND permission_name IN (${placeholders})`,
        [req.user.id, ...permissionNames]
      );

      if (permissions[0].count === 0) {
        return res.status(403).json({
          success: false,
          message: `ليس لديك أي من الصلاحيات المطلوبة: ${permissionNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  verifyToken,
  isStaff,
  isCustomer,
  hasPermission,
  hasAnyPermission
};


