const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Confirm purchase for an order
 * @route   POST /api/v1/orders/:orderId/confirm-purchase
 * @access  Private (User only)
 */
const confirmOrderPurchase = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const {
    payment_method, // 'cash' or 'card'
    purchase_method, // 'mall' or 'online'
    card_id, // إذا كان الدفع ببطاقة
    discount_amount = 0, // خصم Gift Card
    expenses_amount = 0, // مصاريف إضافية
    expenses_notes = '', // ملاحظات المصاريف
  } = req.body;

  const userId = req.user.id;

  // التحقق من صحة البيانات
  if (!payment_method || !['cash', 'card'].includes(payment_method)) {
    return errorResponse(res, 'طريقة الدفع غير صحيحة. يجب أن تكون cash أو card', 400);
  }

  if (!purchase_method || !['mall', 'online'].includes(purchase_method)) {
    return errorResponse(res, 'طريقة الشراء غير صحيحة. يجب أن تكون mall أو online', 400);
  }

  if (payment_method === 'card' && !card_id) {
    return errorResponse(res, 'يجب اختيار البطاقة عند الدفع بالبطاقة', 400);
  }

  if (discount_amount < 0 || expenses_amount < 0) {
    return errorResponse(res, 'المبالغ لا يمكن أن تكون سالبة', 400);
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. جلب معلومات الطلب من order_invoices
    const [orderResult] = await connection.query(
      `SELECT o.id, o.cart_id, o.position_id,
              oi.total_amount as order_total, od.title
       FROM orders o
       INNER JOIN order_details od ON od.order_id = o.id
       INNER JOIN order_invoices oi ON oi.id = o.order_invoice_id
       WHERE o.id = ? AND o.is_active = 1`,
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
      return errorResponse(res, 'الطلب ليس في حالة "تحت الشراء". الحالة الحالية: ' + order.position_id, 400);
    }

    // 3. حساب المبلغ المطلوب دفعه
    const orderTotal = parseFloat(order.order_total) || 0;
    const prepaidValue = parseFloat(order.prepaid_value) || 0;
    const discountAmount = parseFloat(discount_amount) || 0;
    const expensesAmount = parseFloat(expenses_amount) || 0;

    const amountToPay = orderTotal - prepaidValue - discountAmount + expensesAmount;

    if (amountToPay < 0) {
      await connection.rollback();
      return errorResponse(res, 'المبلغ المحسوب غير صحيح. المبلغ: ' + amountToPay, 400);
    }

    let cash_amount = 0;
    let card_paid_amount = 0;

    // 4. التحقق من الرصيد والخصم
    if (payment_method === 'cash') {
      // جلب رصيد النقد
      const [treasuryDetails] = await connection.query(
        'SELECT * FROM try_treasury_details ORDER BY id DESC LIMIT 1'
      );

      const currentCashBalance = treasuryDetails.length > 0 ? parseFloat(treasuryDetails[0].cash_amount) || 0 : 0;

      if (currentCashBalance < amountToPay) {
        await connection.rollback();
        return errorResponse(res, `رصيد النقد غير كافٍ. الرصيد الحالي: ${currentCashBalance.toFixed(2)} د.ل، المطلوب: ${amountToPay.toFixed(2)} د.ل`, 400);
      }

      cash_amount = amountToPay;

      // خصم من رصيد النقد
      if (treasuryDetails.length > 0) {
        const newCashBalance = currentCashBalance - amountToPay;
        await connection.query(
          'UPDATE try_treasury_details SET cash_amount = ? WHERE id = ?',
          [newCashBalance, treasuryDetails[0].id]
        );
      }

    } else if (payment_method === 'card') {
      // التحقق من وجود البطاقة
      const [cardDetails] = await connection.query(
        'SELECT id FROM payment_cards WHERE id = ?',
        [card_id]
      );

      if (cardDetails.length === 0) {
        await connection.rollback();
        return errorResponse(res, 'البطاقة المحددة غير موجودة', 400);
      }

      // جلب رصيد البطاقة
      const [treasuryDetails] = await connection.query(
        'SELECT * FROM try_treasury_details ORDER BY id DESC LIMIT 1'
      );

      const currentCardBalance = treasuryDetails.length > 0 ? parseFloat(treasuryDetails[0].card_amount) || 0 : 0;

      if (currentCardBalance < amountToPay) {
        await connection.rollback();
        return errorResponse(res, `رصيد البطاقة غير كافٍ. الرصيد الحالي: ${currentCardBalance.toFixed(2)} د.ل، المطلوب: ${amountToPay.toFixed(2)} د.ل`, 400);
      }

      card_paid_amount = amountToPay;

      // خصم من رصيد البطاقة
      if (treasuryDetails.length > 0) {
        const newCardBalance = currentCardBalance - amountToPay;
        await connection.query(
          'UPDATE try_treasury_details SET card_amount = ? WHERE id = ?',
          [newCardBalance, treasuryDetails[0].id]
        );
      }
    }

    // 5. تحديث الفاتورة الموجودة بدلاً من إنشاء فاتورة جديدة
    const [updateResult] = await connection.query(
      `UPDATE order_invoices SET 
        payment_method = ?, 
        purchase_method = ?,
        cash_amount = ?, 
        card_id = ?, 
        card_paid_amount = ?,
        discount_amount = ?,
        expenses_amount = ?,
        expenses_notes = ?
       WHERE id = (SELECT order_invoice_id FROM orders WHERE id = ?)`,
      [
        payment_method,
        purchase_method,
        cash_amount,
        payment_method === 'card' ? card_id : null,
        card_paid_amount,
        discountAmount,
        expensesAmount,
        expenses_notes,
        orderId
      ]
    );

    // جلب invoice_id و invoice_number من الفاتورة المحدثة
    const [invoiceResult] = await connection.query(
      'SELECT id, invoice_number FROM order_invoices WHERE id = (SELECT order_invoice_id FROM orders WHERE id = ?)',
      [orderId]
    );

    const invoiceId = invoiceResult[0].id;
    const invoiceNumber = invoiceResult[0].invoice_number;

    // 6. تحديث الطلب: position_id = 3 و ربط الفاتورة
    await connection.query(
      `UPDATE orders 
       SET position_id = 3, order_invoice_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [invoiceId, orderId]
    );

    // 7. التحقق من جميع الطلبات في السلة وإغلاقها تلقائياً إذا تم شراء الكل
    if (order.cart_id) {
      // استخدام نفس الكويري الذي نجح في الاختبار اليدوي
      const [updateResult] = await connection.query(
        `UPDATE cart 
         SET is_available = 0 
         WHERE id = ? 
         AND id IN (
           SELECT cart_id FROM (
             SELECT 
               cart_id,
               COUNT(*) as total,
               SUM(CASE WHEN position_id >= 3 THEN 1 ELSE 0 END) as purchased
             FROM orders 
             WHERE cart_id = ? AND is_active = 1
             GROUP BY cart_id
             HAVING total = purchased AND total > 0
           ) as subquery
         )`,
        [order.cart_id, order.cart_id]
      );

      // إضافة رسالة في الـ response إذا تم إغلاق السلة
      if (updateResult.affectedRows > 0) {
        console.log(`✅ تم إغلاق السلة ${order.cart_id} تلقائياً - جميع الطلبات تم شراؤها`);
        
        // حساب إجمالي فاتورة السلة تلقائياً
        await calculateAndUpdateCartTotal(connection, order.cart_id);
      }
    }

    await connection.commit();

    successResponse(res, {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      order_id: orderId,
      cart_id: order.cart_id,
      amount_paid: amountToPay,
      payment_method,
      discount_amount: discountAmount,
      expenses_amount: expensesAmount,
      order_total: orderTotal,
      prepaid_value: prepaidValue,
    }, 'تم تأكيد شراء الطلب بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    console.error('Error in confirmOrderPurchase:', error);
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get order purchase details
 * @route   GET /api/v1/orders/:orderId/purchase-details
 * @access  Private (User only)
 */
const getOrderPurchaseDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const [orderResult] = await db.query(
    `SELECT 
      o.id,
      o.position_id,
      o.cart_id,
      o.order_invoice_id,
      od.title,
      od.description,
      od.image_url,
      -- الأسعار الحقيقية من order_invoices
      oi.item_price as original_product_price,
      oi.item_price as commission, -- نفس السعر مؤقتاً
      oi.total_amount as order_total,
      od.color,
      od.size,
      op.name as position_name,
      b.name as brand_name,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email,
      c.phone as customer_phone,
      oi.id as invoice_id,
      oi.invoice_number,
      oi.payment_method as invoice_payment_method,
      oi.total_amount as invoice_total,
      oi.discount_amount,
      oi.expenses_amount,
      oi.expenses_notes
    FROM orders o
    INNER JOIN order_details od ON od.order_id = o.id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN order_position op ON op.id = o.position_id
    LEFT JOIN brands b ON b.id = o.brand_id
    LEFT JOIN order_invoices oi ON oi.id = o.order_invoice_id
    WHERE o.id = ? AND o.is_active = 1`,
    [orderId]
  );

  if (orderResult.length === 0) {
    return errorResponse(res, 'الطلب غير موجود', 404);
  }

  const order = orderResult[0];

  // Calculate remaining amount to pay
  const orderTotal = parseFloat(order.order_total) || 0;
  const prepaidValue = parseFloat(order.prepaid_value) || 0;
  const remainingAmount = orderTotal - prepaidValue;

  successResponse(res, {
    order: {
      ...order,
      remaining_amount: remainingAmount,
      can_purchase: order.position_id === 2 && remainingAmount > 0
    }
  }, 'تم جلب تفاصيل الطلب بنجاح');
});

/**
 * حساب وإضافة إجمالي فاتورة السلة تلقائياً
 * @param {Object} connection - Database connection
 * @param {number} cartId - Cart ID
 */
async function calculateAndUpdateCartTotal(connection, cartId) {
  try {
    console.log(`🧮 حساب إجمالي فاتورة السلة ${cartId}...`);
    
    // جلب جميع فواتير الطلبات في السلة
    const [invoices] = await connection.query(
      `SELECT 
        oi.total_amount,
        oi.expenses_amount,
        oi.discount_amount
       FROM orders o
       INNER JOIN order_invoices oi ON o.order_invoice_id = oi.id
       WHERE o.cart_id = ? AND o.is_active = 1`,
      [cartId]
    );

    if (invoices.length === 0) {
      console.log(`⚠️ لا توجد فواتير للسلة ${cartId}`);
      return;
    }

    // حساب الإجمالي
    let totalAmount = 0;
    let totalExpenses = 0;
    let totalDiscount = 0;

    invoices.forEach(invoice => {
      totalAmount += parseFloat(invoice.total_amount || 0);
      totalExpenses += parseFloat(invoice.expenses_amount || 0);
      totalDiscount += parseFloat(invoice.discount_amount || 0);
    });

    // الصيغة: (إجمالي الطلبات + المصاريف) - الخصم
    const finalTotal = (totalAmount + totalExpenses) - totalDiscount;

    console.log(`📊 إجمالي السلة ${cartId}:`, {
      totalAmount,
      totalExpenses,
      totalDiscount,
      finalTotal
    });

    // إنشاء أو تحديث فاتورة الشراء للسلة
    const [existingInvoice] = await connection.query(
      'SELECT id FROM purchase_invoices WHERE cart_id = ?',
      [cartId]
    );

    if (existingInvoice.length > 0) {
      // تحديث الفاتورة الموجودة
      await connection.query(
        'UPDATE purchase_invoices SET total = ? WHERE cart_id = ?',
        [finalTotal, cartId]
      );
      console.log(`✅ تم تحديث فاتورة الشراء للسلة ${cartId}: ${finalTotal}`);
    } else {
      // إنشاء فاتورة جديدة
      await connection.query(
        'INSERT INTO purchase_invoices (cart_id, total, created_at) VALUES (?, ?, NOW())',
        [cartId, finalTotal]
      );
      console.log(`✅ تم إنشاء فاتورة شراء جديدة للسلة ${cartId}: ${finalTotal}`);
    }

  } catch (error) {
    console.error(`❌ خطأ في حساب إجمالي السلة ${cartId}:`, error);
    throw error;
  }
}

module.exports = {
  confirmOrderPurchase,
  getOrderPurchaseDetails,
};
