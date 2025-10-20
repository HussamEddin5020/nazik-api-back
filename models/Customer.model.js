const db = require('../config/database');

class Customer {
  /**
   * Find customer by ID
   */
  static async findById(customerId) {
    const [customers] = await db.query(
      `SELECT c.*, u.name, u.email, u.phone, u.status,
              a.city_id, a.area_id, a.street,
              ci.name as city_name, ar.name as area_name
       FROM customers c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN addresses a ON c.address_id = a.id
       LEFT JOIN cities ci ON a.city_id = ci.id
       LEFT JOIN areas ar ON a.area_id = ar.id
       WHERE c.id = ?`,
      [customerId]
    );
    
    return customers[0] || null;
  }

  /**
   * Find customer by user ID
   */
  static async findByUserId(userId) {
    const [customers] = await db.query(
      `SELECT c.*, u.name, u.email, u.phone, u.status,
              a.city_id, a.area_id, a.street,
              ci.name as city_name, ar.name as area_name
       FROM customers c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN addresses a ON c.address_id = a.id
       LEFT JOIN cities ci ON a.city_id = ci.id
       LEFT JOIN areas ar ON a.area_id = ar.id
       WHERE c.user_id = ?`,
      [userId]
    );
    
    return customers[0] || null;
  }

  /**
   * Get customer orders count
   */
  static async getOrdersCount(customerId) {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND is_active = 1',
      [customerId]
    );

    return result[0].count;
  }

  /**
   * Get customer collection
   */
  static async getCollection(customerId) {
    const [collections] = await db.query(
      'SELECT * FROM collections WHERE customer_id = ?',
      [customerId]
    );

    return collections[0] || null;
  }
}

module.exports = Customer;


