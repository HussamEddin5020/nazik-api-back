const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  /**
   * Find user by ID
   */
  static async findById(userId) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    return users[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    return users[0] || null;
  }

  /**
   * Find user by phone
   */
  static async findByPhone(phone) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );
    
    return users[0] || null;
  }

  /**
   * Find user by email or phone
   */
  static async findByIdentifier(identifier) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [identifier, identifier]
    );
    
    return users[0] || null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Hash password
   */
  static async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Get user permissions
   */
  static async getPermissions(userId) {
    const [permissions] = await db.query(
      `SELECT p.id as permission_id, p.name as permission_name,
              a.id as action_id, a.name as action_name
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       JOIN actions a ON up.action_id = a.id
       WHERE up.user_id = ?`,
      [userId]
    );

    return permissions;
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(userId, permissionName, actionName) {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       JOIN actions a ON up.action_id = a.id
       WHERE up.user_id = ? AND p.name = ? AND a.name = ?`,
      [userId, permissionName, actionName]
    );

    return result[0].count > 0;
  }
}

module.exports = User;


