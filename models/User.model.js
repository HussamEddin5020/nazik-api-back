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
   * Get user permissions (النظام الجديد)
   */
  static async getPermissions(userId) {
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

    return permissions;
  }

  /**
   * Check if user has permission (النظام الجديد)
   */
  static async hasPermission(userId, permissionName) {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM v_user_permissions
       WHERE user_id = ? AND permission_name = ?`,
      [userId, permissionName]
    );

    return result[0].count > 0;
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(userId, permissionNames) {
    const placeholders = permissionNames.map(() => '?').join(',');
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM v_user_permissions
       WHERE user_id = ? AND permission_name IN (${placeholders})`,
      [userId, ...permissionNames]
    );

    return result[0].count > 0;
  }
}

module.exports = User;


