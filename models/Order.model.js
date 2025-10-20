const db = require('../config/database');

class Order {
  /**
   * Find order by ID
   */
  static async findById(orderId) {
    const [orders] = await db.query(
      `SELECT o.*, op.name as position_name,
              u.name as customer_name, u.email as customer_email,
              od.title, od.total, od.color, od.size
       FROM orders o
       LEFT JOIN order_position op ON o.position_id = op.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN order_details od ON o.id = od.order_id
       WHERE o.id = ?`,
      [orderId]
    );
    
    return orders[0] || null;
  }

  /**
   * Find orders by customer ID
   */
  static async findByCustomerId(customerId, filters = {}) {
    const { position_id } = filters;
    
    let query = `
      SELECT o.*, op.name as position_name,
             od.title, od.total
      FROM orders o
      LEFT JOIN order_position op ON o.position_id = op.id
      LEFT JOIN order_details od ON o.id = od.order_id
      WHERE o.customer_id = ? AND o.is_active = 1
    `;
    
    const params = [customerId];

    if (position_id) {
      query += ' AND o.position_id = ?';
      params.push(position_id);
    }

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await db.query(query, params);
    return orders;
  }

  /**
   * Get order statistics
   */
  static async getStatistics() {
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN position_id = 1 THEN 1 END) as new_orders,
        COUNT(CASE WHEN position_id = 11 THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as cancelled_orders
       FROM orders WHERE is_active = 1`
    );

    return stats[0];
  }

  /**
   * Get orders by position
   */
  static async getByPosition(positionId) {
    const [orders] = await db.query(
      `SELECT o.id, o.created_at, o.barcode,
              op.name as position_name,
              u.name as customer_name,
              od.title, od.total
       FROM orders o
       LEFT JOIN order_position op ON o.position_id = op.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN order_details od ON o.id = od.order_id
       WHERE o.position_id = ? AND o.is_active = 1
       ORDER BY o.created_at DESC`,
      [positionId]
    );

    return orders;
  }
}

module.exports = Order;


