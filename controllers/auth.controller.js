const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, sanitizeUser } = require('../utils/helpers');

/**
 * Generate JWT Token
 */
const generateToken = (userId, type) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { userId, type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (userId) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * @desc    Register new customer
 * @route   POST /api/v1/auth/register/customer
 * @access  Public
 */
exports.registerCustomer = asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { name, email, phone, password, city_id, area_id, street } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert user
    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, phone, password_hash, type, status) 
       VALUES (?, ?, ?, ?, 'customer', 'active')`,
      [name, email || null, phone, password_hash]
    );

    const userId = userResult.insertId;

    // Create address
    const [addressResult] = await connection.query(
      `INSERT INTO addresses (city_id, area_id, street) 
       VALUES (?, ?, ?)`,
      [city_id, area_id, street || null]
    );

    const addressId = addressResult.insertId;

    // Create customer record
    await connection.query(
      `INSERT INTO customers (user_id, address_id) 
       VALUES (?, ?)`,
      [userId, addressId]
    );

    // Log registration in customer_audit_logs
    await connection.query(
      `INSERT INTO customer_audit_logs (actor_customer_id, entity_type, entity_id, action, new_data)
       VALUES (?, 'customer', ?, 'REGISTER', ?)`,
      [userId, userId, JSON.stringify({ name, email, phone, city_id, area_id, street })]
    );

    await connection.commit();

    // Generate tokens
    const token = generateToken(userId, 'customer');
    const refreshToken = generateRefreshToken(userId);

    // Get user data
    const [users] = await connection.query(
      `SELECT u.id, u.name, u.email, u.phone, u.type, u.status,
              c.id as customer_id, c.address_id
       FROM users u
       JOIN customers c ON u.id = c.user_id
       WHERE u.id = ?`,
      [userId]
    );

    successResponse(res, {
      user: sanitizeUser(users[0]),
      token,
      refreshToken
    }, 'تم التسجيل بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Register new user/staff
 * @route   POST /api/v1/auth/register/user
 * @access  Public (should be protected)
 */
exports.registerUser = asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { name, email, phone, password, permissions = [] } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert user
    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, phone, password_hash, type, status) 
       VALUES (?, ?, ?, ?, 'user', 'active')`,
      [name, email || null, phone, password_hash]
    );

    const userId = userResult.insertId;

    // Insert permissions if provided (using new system)
    if (permissions.length > 0) {
      // For now, skip permissions insertion as we're using roles system
      // TODO: Implement role assignment during registration
      console.log('Permissions provided but using new roles system - skipping direct permission assignment');
    }

    // Log registration
    await connection.query(
      `INSERT INTO user_audit_logs (actor_user_id, entity_type, entity_id, action, new_data)
       VALUES (?, 'user', ?, 'REGISTER_WITH_PERMISSIONS', ?)`,
      [userId, userId, JSON.stringify({ name, email, phone, type: 'user', permissions })]
    );

    await connection.commit();

    // Generate tokens
    const token = generateToken(userId, 'user');
    const refreshToken = generateRefreshToken(userId);

    // Get user data
    const [users] = await connection.query(
      `SELECT id, name, email, phone, type, status FROM users WHERE id = ?`,
      [userId]
    );

    successResponse(res, {
      user: sanitizeUser(users[0]),
      token,
      refreshToken
    }, 'تم إنشاء المستخدم بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  // Find user by email or phone
  const [users] = await db.query(
    `SELECT * FROM users 
     WHERE (email = ? OR phone = ?) AND status = 'active'`,
    [identifier, identifier]
  );

  if (users.length === 0) {
    return errorResponse(res, 'بيانات الدخول غير صحيحة', 401);
  }

  const user = users[0];

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    // Log failed attempt
    await db.query(
      `INSERT INTO failed_login_attempts (email, phone, failure_reason)
       VALUES (?, ?, 'wrong_password')`,
      [user.email, user.phone]
    );

    return errorResponse(res, 'بيانات الدخول غير صحيحة', 401);
  }

  // Log successful login
  await db.query(
    `INSERT INTO login_events (user_id) VALUES (?)`,
    [user.id]
  );

  // Generate tokens
  const token = generateToken(user.id, user.type);
  const refreshToken = generateRefreshToken(user.id);

  // Get additional data based on user type
  let userData = sanitizeUser(user);
  
  if (user.type === 'customer') {
    const [customers] = await db.query(
      `SELECT c.id as customer_id, c.address_id,
              a.city_id, a.area_id, a.street,
              ci.name as city_name, ar.name as area_name
       FROM customers c
       LEFT JOIN addresses a ON c.address_id = a.id
       LEFT JOIN cities ci ON a.city_id = ci.id
       LEFT JOIN areas ar ON a.area_id = ar.id
       WHERE c.user_id = ?`,
      [user.id]
    );
    
    if (customers.length > 0) {
      userData = { ...userData, ...customers[0] };
    }
  } else {
    // For system users, we don't need to fetch permissions during login
    // Permissions will be fetched separately when needed
    console.log('System user login - permissions will be fetched separately');
  }

  successResponse(res, {
    user: userData,
    token,
    refreshToken
  }, 'تم تسجيل الدخول بنجاح');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return errorResponse(res, 'رمز التحديث مطلوب', 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user
    const [users] = await db.query(
      `SELECT id, type FROM users WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 'المستخدم غير موجود', 401);
    }

    const user = users[0];
    
    // Generate new tokens
    const newToken = generateToken(user.id, user.type);
    const newRefreshToken = generateRefreshToken(user.id);

    successResponse(res, {
      token: newToken,
      refreshToken: newRefreshToken
    }, 'تم تحديث الرمز بنجاح');

  } catch (error) {
    return errorResponse(res, 'رمز التحديث غير صالح', 401);
  }
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  // This endpoint requires authentication middleware
  // Will be implemented in route
  successResponse(res, {
    user: req.user
  });
});

/**
 * @desc    Get current user permissions
 * @route   GET /api/v1/auth/permissions
 * @access  Private (Staff only)
 */
exports.getUserPermissions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if user is staff
  if (req.user.type !== 'user') {
    return successResponse(res, {
      permissions: []
    }, 'العملاء ليس لديهم صلاحيات نظام');
  }

  // Get user permissions from v_user_permissions view
  const [permissions] = await db.query(
    `SELECT DISTINCT 
       p.id,
       p.name,
       p.description,
       p.module,
       p.action
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN new_permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = ?
       AND ur.is_active = 1
       AND r.is_active = 1
       AND rp.is_active = 1
       AND p.is_active = 1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
     ORDER BY p.module, p.name`,
    [userId]
  );

  // Extract just the permission names for easy checking
  const permissionNames = permissions.map(p => p.name);

  successResponse(res, {
    permissions: permissionNames,
    permissionsDetails: permissions
  }, 'تم جلب الصلاحيات بنجاح');
});

module.exports = exports;


