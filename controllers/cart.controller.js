const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, formatCartNumber } = require('../utils/helpers');

/**
 * @desc    Get all carts
 * @route   GET /api/v1/carts
 * @access  Private (Staff)
 */
exports.getAllCarts = asyncHandler(async (req, res) => {
  const { is_available } = req.query;

  let query = 'SELECT * FROM cart WHERE 1=1';
  const params = [];

  if (is_available !== undefined) {
    query += ' AND is_available = ?';
    params.push(is_available === 'true' ? 1 : 0);
  }

  query += ' ORDER BY id DESC';

  const [carts] = await db.query(query, params);

  // Format cart numbers
  const formattedCarts = carts.map(cart => ({
    ...cart,
    cart_number: formatCartNumber(cart.id)
  }));

  successResponse(res, formattedCarts);
});

/**
 * @desc    Get cart by ID with orders
 * @route   GET /api/v1/carts/:id
 * @access  Private (Staff)
 */
exports.getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get cart info
  const [carts] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  if (carts.length === 0) {
    return errorResponse(res, 'العربة غير موجودة', 404);
  }

  // Get cart orders
  const [orders] = await db.query(
    `SELECT o.id, o.customer_id, o.position_id, o.barcode,
            op.name as position_name,
            u.name as customer_name,
            od.title, od.total
     FROM orders o
     LEFT JOIN order_position op ON o.position_id = op.id
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN order_details od ON o.id = od.order_id
     WHERE o.cart_id = ?
     ORDER BY o.created_at DESC`,
    [id]
  );

  const cartData = {
    ...carts[0],
    cart_number: formatCartNumber(carts[0].id),
    orders
  };

  successResponse(res, cartData);
});

/**
 * @desc    Create new cart
 * @route   POST /api/v1/carts
 * @access  Private (Staff)
 */
exports.createCart = asyncHandler(async (req, res) => {
  const [result] = await db.query(
    'INSERT INTO cart (orders_count, is_available) VALUES (0, 1)'
  );

  const [cart] = await db.query('SELECT * FROM cart WHERE id = ?', [result.insertId]);

  successResponse(res, {
    ...cart[0],
    cart_number: formatCartNumber(cart[0].id)
  }, 'تم إنشاء العربة بنجاح', 201);
});

/**
 * @desc    Update cart availability
 * @route   PUT /api/v1/carts/:id/availability
 * @access  Private (Staff)
 */
exports.updateCartAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;

  if (is_available === undefined) {
    return errorResponse(res, 'حالة التوفر مطلوبة', 400);
  }

  await db.query(
    'UPDATE cart SET is_available = ? WHERE id = ?',
    [is_available ? 1 : 0, id]
  );

  const [cart] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  successResponse(res, {
    ...cart[0],
    cart_number: formatCartNumber(cart[0].id)
  }, 'تم تحديث حالة العربة بنجاح');
});

/**
 * @desc    Get orders in a specific cart with full details
 * @route   GET /api/v1/carts/:id/orders
 * @access  Private (Staff)
 */
exports.getCartOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get cart info
  const [carts] = await db.query('SELECT * FROM cart WHERE id = ?', [id]);

  if (carts.length === 0) {
    return errorResponse(res, 'السلة غير موجودة', 404);
  }

  // Get orders with full details
  const [orders] = await db.query(
    `SELECT 
      o.id,
      o.customer_id,
      o.position_id,
      o.cart_id,
      o.box_id,
      o.purchase_method,
      o.is_archived,
      o.order_invoice_id,
      o.created_at,
      o.updated_at,
      od.image_url,
      od.title,
      od.description,
      od.notes,
      od.color,
      od.size,
      od.capacity,
      od.prepaid_value,
      od.original_product_price,
      od.commission,
      od.total as order_total,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email,
      c.phone as customer_phone,
      op.name as position_name,
      oi.id as invoice_id,
      oi.invoice_number,
      oi.quantity,
      oi.total_amount as invoice_total,
      b.name as brand_name
    FROM orders o
    INNER JOIN order_details od ON od.order_id = o.id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN order_invoices oi ON oi.order_id = o.id
    LEFT JOIN brands b ON b.id = o.brand_id
    WHERE o.cart_id = ?
    ORDER BY o.created_at DESC`,
    [id]
  );

  successResponse(res, {
    cart: {
      ...carts[0],
      cart_number: formatCartNumber(carts[0].id),
    },
    orders,
  }, 'تم جلب طلبات السلة بنجاح');
});

/**
 * @desc    Confirm purchase for an order
 * @route   POST /api/v1/carts/orders/:orderId/confirm-purchase
 * @access  Private (Staff)
 */
exports.confirmOrderPurchase = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const {
    payment_method, // 'cash' or 'card'
    card_id, // إذا كان الدفع ببطاقة
    discount_amount = 0, // خصم Gift Card
    expenses_amount = 0, // مصاريف إضافية
    expenses_notes = '', // ملاحظات المصاريف
  } = req.body;

  const userId = req.user.id;

  // التحقق من صحة البيانات
  if (!payment_method || !['cash', 'card'].includes(payment_method)) {
    return errorResponse(res, 'طريقة الدفع غير صحيحة', 400);
  }

  if (payment_method === 'card' && !card_id) {
    return errorResponse(res, 'يجب اختيار البطاقة', 400);
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. جلب معلومات الطلب
    const [orderResult] = await connection.query(
      `SELECT o.id, o.cart_id, o.position_id, o.purchase_method,
              od.total as order_total, od.prepaid_value, od.title
       FROM orders o
       INNER JOIN order_details od ON od.order_id = o.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'الطلب غير موجود', 404);
    }

    const order = orderResult[0];

    // 2. التحقق من أن الطلب في حالة "تحت الشراء" (position_id = 2)
    if (order.position_id !== 2) {
      await connection.rollback();
      return errorResponse(res, 'الطلب ليس في حالة "تحت الشراء"', 400);
    }

    // 3. حساب المبلغ المطلوب دفعه
    const amountToPay = parseFloat(order.order_total) - parseFloat(order.prepaid_value) - parseFloat(discount_amount) + parseFloat(expenses_amount);

    if (amountToPay < 0) {
      await connection.rollback();
      return errorResponse(res, 'المبلغ المحسوب غير صحيح', 400);
    }

    let cash_amount = 0;
    let card_paid_amount = 0;

    // 4. التحقق من الرصيد والخصم
    if (payment_method === 'cash') {
      // جلب رصيد النقد
      const [treasuryDetails] = await connection.query(
        'SELECT cash_amount FROM try_treasury_details ORDER BY id DESC LIMIT 1'
      );

      const currentCashBalance = treasuryDetails.length > 0 ? parseFloat(treasuryDetails[0].cash_amount) : 0;

      if (currentCashBalance < amountToPay) {
        await connection.rollback();
        return errorResponse(res, `رصيد النقد غير كافٍ. الرصيد الحالي: ${currentCashBalance.toFixed(2)} د.ل`, 400);
      }

      cash_amount = amountToPay;

      // خصم من رصيد النقد
      if (treasuryDetails.length > 0) {
        await connection.query(
          'UPDATE try_treasury_details SET cash_amount = cash_amount - ? WHERE id = ?',
          [amountToPay, treasuryDetails[0].id]
        );
      }

    } else if (payment_method === 'card') {
      // جلب رصيد البطاقة
      const [cardDetails] = await connection.query(
        'SELECT card_amount FROM try_treasury_details ORDER BY id DESC LIMIT 1'
      );

      const currentCardBalance = cardDetails.length > 0 ? parseFloat(cardDetails[0].card_amount) : 0;

      if (currentCardBalance < amountToPay) {
        await connection.rollback();
        return errorResponse(res, `رصيد البطاقة غير كافٍ. الرصيد الحالي: ${currentCardBalance.toFixed(2)} د.ل`, 400);
      }

      card_paid_amount = amountToPay;

      // خصم من رصيد البطاقة
      if (cardDetails.length > 0) {
        await connection.query(
          'UPDATE try_treasury_details SET card_amount = card_amount - ? WHERE id = ?',
          [amountToPay, cardDetails[0].id]
        );
      }
    }

    // 5. إنشاء الفاتورة
    const invoiceNumber = `INV-${Date.now()}-${orderId}`;
    
    const [invoiceResult] = await connection.query(
      `INSERT INTO order_invoices (
        invoice_number, item_price, quantity, total_amount, order_id, cart_id,
        payment_method, cash_amount, card_id, card_paid_amount,
        discount_amount, expenses_amount, expenses_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        order.order_total,
        1, // الكمية
        amountToPay,
        orderId,
        order.cart_id,
        payment_method,
        cash_amount,
        payment_method === 'card' ? card_id : null,
        card_paid_amount,
        discount_amount,
        expenses_amount,
        expenses_notes,
      ]
    );

    const invoiceId = invoiceResult.insertId;

    // 6. تحديث الطلب: position_id = 3 و ربط الفاتورة
    await connection.query(
      `UPDATE orders 
       SET position_id = 3, order_invoice_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [invoiceId, orderId]
    );

    // 7. التحقق من جميع الطلبات في السلة
    if (order.cart_id) {
      const [cartOrders] = await connection.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN position_id >= 3 THEN 1 ELSE 0 END) as purchased
         FROM orders
         WHERE cart_id = ? AND is_archived = 0`,
        [order.cart_id]
      );

      // إذا تم شراء جميع الطلبات → إغلاق السلة
      if (cartOrders[0].total === cartOrders[0].purchased && cartOrders[0].total > 0) {
        await connection.query(
          'UPDATE cart SET is_available = 0 WHERE id = ?',
          [order.cart_id]
        );
      }
    }

    await connection.commit();

    successResponse(res, {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      amount_paid: amountToPay,
      payment_method,
      order_id: orderId,
      cart_id: order.cart_id,
    }, 'تم تأكيد شراء الطلب بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get all payment cards
 * @route   GET /api/v1/carts/payment-cards
 * @access  Private (Staff)
 */
exports.getPaymentCards = asyncHandler(async (req, res) => {
  const [cards] = await db.query(
    `SELECT 
      id,
      CONCAT('****-****-****-', RIGHT(card_number, 4)) as masked_card_number,
      card_number,
      exp_date
    FROM payment_cards
    ORDER BY id DESC`
  );

  successResponse(res, { cards }, 'تم جلب البطاقات بنجاح');
});

/**
 * @desc    Get treasury balance
 * @route   GET /api/v1/carts/treasury/balance
 * @access  Private (Staff)
 */
exports.getTreasuryBalance = asyncHandler(async (req, res) => {
  const [details] = await db.query(
    'SELECT card_amount, cash_amount FROM try_treasury_details ORDER BY id DESC LIMIT 1'
  );

  if (details.length === 0) {
    return successResponse(res, {
      card_balance: 0,
      cash_balance: 0,
      total_balance: 0,
    }, 'لا توجد بيانات للخزينة');
  }

  successResponse(res, {
    card_balance: parseFloat(details[0].card_amount),
    cash_balance: parseFloat(details[0].cash_amount),
    total_balance: parseFloat(details[0].card_amount) + parseFloat(details[0].cash_amount),
  }, 'تم جلب رصيد الخزينة بنجاح');
});

module.exports = exports;


