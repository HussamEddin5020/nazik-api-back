const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'لا يوجد رمز تفويض. الرجاء تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await db.query(
      `SELECT id, name, email, phone, type, status 
       FROM users 
       WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو معطل'
      });
    }

    // Attach user to request
    req.user = users[0];
    
    // Set session variables for database triggers
    await db.query('SET @current_user_id = ?', [req.user.id]);
    await db.query('SET @current_user_type = ?', [req.user.type]);
    
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
  if (req.user.type !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذا المورد. مخصص للموظفين فقط'
    });
  }
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

// Check specific permission
const hasPermission = (permissionName, actionName) => {
  return async (req, res, next) => {
    try {
      // Customers have limited permissions
      if (req.user.type === 'customer') {
        return next();
      }

      // Check if user has permission
      const [permissions] = await db.query(
        `SELECT COUNT(*) as count
         FROM user_permissions up
         JOIN permissions p ON up.permission_id = p.id
         JOIN actions a ON up.action_id = a.id
         WHERE up.user_id = ? 
         AND p.name = ? 
         AND a.name = ?`,
        [req.user.id, permissionName, actionName]
      );

      if (permissions[0].count === 0) {
        return res.status(403).json({
          success: false,
          message: `ليس لديك صلاحية ${actionName} على ${permissionName}`
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
  hasPermission
};


