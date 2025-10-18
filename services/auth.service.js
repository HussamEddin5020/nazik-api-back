const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthService {
  /**
   * Generate JWT Token
   */
  static generateToken(userId, type) {
    return jwt.sign(
      { userId, type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Generate Refresh Token
   */
  static generateRefreshToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
  }

  /**
   * Verify Refresh Token
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  }

  /**
   * Hash Password
   */
  static async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Compare Password
   */
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Log Failed Login Attempt
   */
  static async logFailedAttempt(email, phone, reason) {
    await db.query(
      `INSERT INTO failed_login_attempts (email, phone, failure_reason)
       VALUES (?, ?, ?)`,
      [email, phone, reason]
    );
  }

  /**
   * Log Successful Login
   */
  static async logSuccessfulLogin(userId) {
    await db.query(
      'INSERT INTO login_events (user_id) VALUES (?)',
      [userId]
    );
  }

  /**
   * Get user with full details
   */
  static async getUserWithDetails(userId, userType) {
    if (userType === 'customer') {
      const [customers] = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, u.type, u.status,
                c.id as customer_id, c.address_id,
                a.city_id, a.area_id, a.street,
                ci.name as city_name, ar.name as area_name
         FROM users u
         JOIN customers c ON u.id = c.user_id
         LEFT JOIN addresses a ON c.address_id = a.id
         LEFT JOIN cities ci ON a.city_id = ci.id
         LEFT JOIN areas ar ON a.area_id = ar.id
         WHERE u.id = ?`,
        [userId]
      );

      return customers[0] || null;
    } else {
      const [users] = await db.query(
        `SELECT id, name, email, phone, type, status FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) return null;

      // Get permissions
      // Get user permissions using new system
      const [permissions] = await db.query(
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
        [userId]
      );

      return {
        ...users[0],
        permissions
      };
    }
  }
}

module.exports = AuthService;


