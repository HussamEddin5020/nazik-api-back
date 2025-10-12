const db = require('../config/database');

class OrderService {
  /**
   * Create order with transaction
   */
  static async createOrder(orderData, connection) {
    const {
      customer_id,
      creator_user_id,
      creator_customer_id,
      position_id = 1,
      details
    } = orderData;

    // Get or create collection
    let [collections] = await connection.query(
      'SELECT id FROM collections WHERE customer_id = ?',
      [customer_id]
    );

    let collection_id;
    if (collections.length === 0) {
      const [result] = await connection.query(
        'INSERT INTO collections (customer_id) VALUES (?)',
        [customer_id]
      );
      collection_id = result.insertId;
    } else {
      collection_id = collections[0].id;
    }

    // Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (creator_user_id, creator_customer_id, customer_id, collection_id, position_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [creator_user_id, creator_customer_id, customer_id, collection_id, position_id]
    );

    const orderId = orderResult.insertId;

    // Insert details if provided
    if (details) {
      await connection.query(
        `INSERT INTO order_details 
         (order_id, image_url, title, description, notes, color, size, capacity,
          prepaid_value, original_product_price, commission, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          details.image_url || null,
          details.title,
          details.description || null,
          details.notes || null,
          details.color || null,
          details.size || null,
          details.capacity || null,
          details.prepaid_value || 0,
          details.original_product_price || 0,
          details.commission || 0,
          details.total || 0
        ]
      );
    }

    return orderId;
  }

  /**
   * Update order position with history
   */
  static async updateOrderPosition(orderId, newPositionId, userId, reason = null, notes = null) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update order
      await connection.query(
        'UPDATE orders SET position_id = ? WHERE id = ?',
        [newPositionId, orderId]
      );

      // The trigger will automatically create history entry
      // But we can add reason and notes if needed
      if (reason || notes) {
        await connection.query(
          `UPDATE order_status_history 
           SET reason = ?, notes = ?
           WHERE order_id = ? 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [reason, notes, orderId]
        );
      }

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign order to cart
   */
  static async assignToCart(orderId, cartId) {
    await db.query(
      'UPDATE orders SET cart_id = ? WHERE id = ?',
      [cartId, orderId]
    );
  }

  /**
   * Assign order to box
   */
  static async assignToBox(orderId, boxId) {
    await db.query(
      'UPDATE orders SET box_id = ? WHERE id = ?',
      [boxId, orderId]
    );
  }

  /**
   * Archive order
   */
  static async archiveOrder(orderId) {
    await db.query(
      'UPDATE orders SET is_archived = 1 WHERE id = ?',
      [orderId]
    );
  }

  /**
   * Unarchive order
   */
  static async unarchiveOrder(orderId) {
    await db.query(
      'UPDATE orders SET is_archived = 0 WHERE id = ?',
      [orderId]
    );
  }
}

module.exports = OrderService;


