const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, generateId } = require('../utils/helpers');
const fetch = require('node-fetch');

// Constants
const EXCHANGE_RATE = 7.35; // Dollar to LYD
const COMMISSION_PERCENTAGE = 20; // 20% commission
const DEPOSIT_PERCENTAGE = 30; // 30% deposit
const SHIPPING_COST = 20; // Fixed shipping cost in LYD
const DARB_ASSABIL_BASE_URL = 'https://v2.sabil.ly';
// Bearer token from Postman: eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXRJZCI6IjY4ZmY5YWNlZjgwNzFmZTNiYTAwMmQ4OSIsInN1YiI6Im9hdXRoX3NlY3JldCIsImlzcyI6IkRhcmIgQXNzYWJpbCIsImF1ZCI6IkRhcmIgQXNzYWJpbCIsImlhdCI6MTc2MTU4MTc3NCwiZXhwIjoxNzgwMTc0Nzk5LjQ4NX0.SsFnN2kp7TgQHcR0gWWHEvxUj5UGEnr9jcFMFLXK0vk
const DARB_ASSABIL_API_KEY = process.env.DARB_ASSABIL_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXRJZCI6IjY4ZmY5YWNlZjgwNzFmZTNiYTAwMmQ4OSIsInN1YiI6Im9hdXRoX3NlY3JldCIsImlzcyI6IkRhcmIgQXNzYWJpbCIsImF1ZCI6IkRhcmIgQXNzYWJpbCIsImlhdCI6MTc2MTU4MTc3NCwiZXhwIjoxNzgwMTc0Nzk5LjQ4NX0.SsFnN2kp7TgQHcR0gWWHEvxUj5UGEnr9jcFMFLXK0vk';
const DARB_ASSABIL_API_VERSION = '1.0.0';
const DARB_ASSABIL_ACCOUNT_ID = process.env.DARB_ASSABIL_ACCOUNT_ID || '684addf0deb7b1dc13092829';
const DARB_ASSABIL_SERVICE_ID = '67ed8ed1f406d9671db58d8b'; // Fixed service ID

/**
 * @desc    Create complete order (collection + order + order_details + order_invoices)
 * @route   POST /api/v1/orders/create-complete
 * @access  Private (Staff with create_orders permission)
 */
exports.createCompleteOrder = asyncHandler(async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      // Customer info
      customer_phone, // Phone from Darb Assabil
      customer_name, // Name from Darb Assabil
      darb_assabil_contact_id, // Contact ID from Darb Assabil
      
      // Collection info
      collection_id, // Optional: existing collection ID
      create_new_collection = false, // Whether to create new collection
      
      // Product info
      product_title,
      product_price_usd, // Product price in USD
      product_color,
      product_size,
      product_link, // Optional product URL
      product_description, // Optional
      product_image_url, // Optional
      
      // Location info
      city_id,
      area_id,
      
      // Payment info
      payment_by = 'receiver', // 'receiver' or 'sales'
      
      // Notes
      notes, // Optional
    } = req.body;

    // Validate required fields
    if (!customer_phone || !customer_name || !darb_assabil_contact_id) {
      return errorResponse(res, 'بيانات العميل مطلوبة (رقم الهاتف، الاسم، معرف Contact)', 400);
    }

    if (!product_title || !product_price_usd || !city_id || !area_id) {
      return errorResponse(res, 'بيانات المنتج والموقع مطلوبة', 400);
    }

    // Step 1: Verify customer exists in local database
    const [customers] = await connection.query(
      `SELECT c.id as customer_id, c.user_id, u.name, u.phone, u.email
       FROM customers c
       JOIN users u ON c.user_id = u.id
       WHERE u.phone = ? AND u.type = 'customer'`,
      [customer_phone]
    );

    if (customers.length === 0) {
      await connection.rollback();
      return errorResponse(
        res,
        'الزبون لا يمتلك لدينا حساب. اطلب منه إنشاء حساب جديد بنفس رقم الهاتف المدرج لدى شركة درب السبيل أو codex',
        400
      );
    }

    const customer = customers[0];
    const customer_id = customer.customer_id;

    // Step 2: Handle Collection (check 4 days rule)
    let final_collection_id;

    if (collection_id) {
      // Check if collection exists and is within 4 days
      const [collections] = await connection.query(
        'SELECT id, created_at FROM collections WHERE id = ? AND customer_id = ?',
        [collection_id, customer_id]
      );

      if (collections.length === 0) {
        await connection.rollback();
        return errorResponse(res, 'المجموعة غير موجودة أو لا تنتمي لهذا العميل', 400);
      }

      const collectionCreatedAt = new Date(collections[0].created_at);
      const now = new Date();
      const daysDiff = (now - collectionCreatedAt) / (1000 * 60 * 60 * 24);

      if (daysDiff > 4) {
        await connection.rollback();
        return errorResponse(
          res,
          `لا يمكن إضافة طلب لهذه المجموعة. مر على إنشائها أكثر من 4 أيام (${Math.round(daysDiff)} يوم)`,
          400
        );
      }

      final_collection_id = collection_id;
    } else {
      // Create new collection
      const [collectionResult] = await connection.query(
        'INSERT INTO collections (customer_id) VALUES (?)',
        [customer_id]
      );
      final_collection_id = collectionResult.insertId;
    }

    // Step 3: Calculate prices
    const product_price_lyd = parseFloat(product_price_usd) * EXCHANGE_RATE;
    const commission = (product_price_lyd * COMMISSION_PERCENTAGE) / 100;
    const total_price = product_price_lyd + commission;
    const deposit_amount = (total_price * DEPOSIT_PERCENTAGE) / 100;

    // Step 4: Determine creator (user or customer)
    const creator_user_id = req.user.type === 'user' ? req.user.id : null;
    const creator_customer_id = req.user.type === 'customer' ? req.user.id : null;

    // Step 5: Create Order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (creator_user_id, creator_customer_id, customer_id, collection_id, position_id, brand_id, is_active) 
       VALUES (?, ?, ?, ?, 1, 1001, 1)`,
      [creator_user_id, creator_customer_id, customer_id, final_collection_id]
    );

    const orderId = orderResult.insertId;

    // Step 6: Create Order Details
    await connection.query(
      `INSERT INTO order_details 
       (order_id, image_url, title, description, notes, color, size, product_link) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        product_image_url || null,
        product_title || 'عربون',
        product_description || null,
        notes || null,
        product_color || null,
        product_size || null,
        product_link || null,
      ]
    );

    // Step 7: Create Order Invoice
    const invoice_number = generateId('INV', 8);
    
    // Calculate invoice amounts based on payment_by
    let item_price = total_price;
    let invoice_total = total_price;
    
    if (payment_by === 'sales') {
      // If payment_by is 'sales', deduct shipping from product amount
      invoice_total = total_price - SHIPPING_COST;
    } else if (payment_by === 'receiver') {
      // If payment_by is 'receiver', add shipping to total
      invoice_total = total_price + SHIPPING_COST;
    }

    const [invoiceResult] = await connection.query(
      `INSERT INTO order_invoices 
       (invoice_number, item_price, quantity, total_amount, order_id, purchase_method) 
       VALUES (?, ?, 1, ?, ?, 'online')`,
      [invoice_number, item_price, invoice_total, orderId]
    );

    const invoiceId = invoiceResult.insertId;

    // Update order with invoice_id
    await connection.query(
      'UPDATE orders SET order_invoice_id = ? WHERE id = ?',
      [invoiceId, orderId]
    );

    await connection.commit();

    // Step 8: Create Local Shipment in Darb Assabil (if needed)
    // This is optional and can be done separately or here
    const shipmentData = await createLocalShipment({
      contact_id: darb_assabil_contact_id,
      customer_name,
      city_id,
      area_id,
      amount: deposit_amount,
      payment_by,
      notes: notes || `شحنة عربون لـ ${customer_name}`,
    });

    // Get created order with details
    const [createdOrder] = await connection.query(
      `SELECT 
        o.id, o.customer_id, o.collection_id, o.position_id, o.brand_id, o.created_at,
        op.name as position_name,
        od.title, od.color, od.size, od.image_url, od.product_link,
        oi.invoice_number, oi.item_price, oi.total_amount,
        c.id as collection_id_display,
        u.name as customer_name_display, u.phone as customer_phone_display
       FROM orders o
       LEFT JOIN order_position op ON o.position_id = op.id
       LEFT JOIN order_details od ON o.id = od.order_id
       LEFT JOIN order_invoices oi ON o.order_invoice_id = oi.id
       LEFT JOIN collections c ON o.collection_id = c.id
       LEFT JOIN customers cu ON o.customer_id = cu.id
       LEFT JOIN users u ON cu.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    successResponse(
      res,
      {
        order: createdOrder[0],
        pricing: {
          product_price_usd: parseFloat(product_price_usd),
          product_price_lyd,
          commission,
          total_price,
          deposit_amount,
          shipping_cost: SHIPPING_COST,
          final_amount: invoice_total,
          payment_by,
        },
        shipment: shipmentData,
      },
      'تم إنشاء الطلبية بنجاح',
      201
    );
  } catch (error) {
    await connection.rollback();
    console.error('Error creating complete order:', error);
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get available collections for customer (less than 4 days old)
 * @route   GET /api/v1/orders/available-collections/:customerId
 * @access  Private (Staff with create_orders permission)
 */
exports.getAvailableCollections = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  if (!customerId) {
    return errorResponse(res, 'معرف العميل مطلوب', 400);
  }

  try {
    const [collections] = await db.query(
      `SELECT 
        c.id,
        c.customer_id,
        c.created_at,
        c.status,
        c.prepaid_value,
        c.total,
        COUNT(DISTINCT o.id) as orders_count,
        DATEDIFF(NOW(), c.created_at) as days_old
       FROM collections c
       LEFT JOIN orders o ON o.collection_id = c.id AND o.is_active = 1
       WHERE c.customer_id = ? 
         AND DATEDIFF(NOW(), c.created_at) <= 4
       GROUP BY c.id, c.customer_id, c.created_at, c.status, c.prepaid_value, c.total
       ORDER BY c.created_at DESC`,
      [customerId]
    );

    successResponse(res, collections);
  } catch (error) {
    console.error('Error fetching available collections:', error);
    return errorResponse(res, 'حدث خطأ أثناء جلب المجموعات المتاحة', 500);
  }
});

/**
 * Create local shipment in Darb Assabil
 */
async function createLocalShipment({
  contact_id,
  customer_name,
  city_id,
  area_id,
  amount,
  payment_by,
  notes,
}) {
  try {
    // Get city and area names from database
    const db = require('../config/database');
    const [cities] = await db.query('SELECT name FROM cities WHERE id = ?', [city_id]);
    const [areas] = await db.query('SELECT name FROM areas WHERE id = ?', [area_id]);

    if (cities.length === 0 || areas.length === 0) {
      console.error('City or area not found');
      return null;
    }

    const city_name = cities[0].name;
    const area_name = areas[0].name;

    // Default coordinates (you may need to get these from database)
    const defaultCoordinates = [13.209649053072173, 32.88748653098251];

    const shipmentPayload = {
      service: DARB_ASSABIL_SERVICE_ID,
      notes: notes || `شحنة عربون لـ ${customer_name}`,
      contacts: [contact_id],
      products: [
        {
          title: `عربون - ${customer_name}`,
          quantity: 1,
          widthCM: 40,
          heightCM: 40,
          lengthCM: 50,
          allowInspection: false,
          allowTesting: false,
          isFragile: false,
          amount: amount,
          currency: 'lyd',
          isChargeable: payment_by === 'sales',
        },
      ],
      paymentBy: payment_by,
      to: {
        countryCode: 'lby',
        city: city_name,
        area: area_name,
        address: '',
        geoPoint: {
          coordinates: defaultCoordinates,
          type: 'Point',
        },
        location: {
          lat: defaultCoordinates[1],
          long: defaultCoordinates[0],
        },
        country: 'Libya',
      },
      isPickup: true,
      allowCardPayment: false,
      allowSplitting: false,
      cardFeePaymentBy: 'receiver',
      allowedBankNotes: {
        '50': false,
      },
      tags: [],
      metadata: {},
    };

    const response = await fetch(`${DARB_ASSABIL_BASE_URL}/api/local/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${DARB_ASSABIL_API_KEY}`,
        'X-API-VERSION': DARB_ASSABIL_API_VERSION,
        'X-ACCOUNT-ID': DARB_ASSABIL_ACCOUNT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creating local shipment:', errorText);
      return { error: errorText, success: false };
    }

    const data = await response.json();
    return { ...data, success: true };
  } catch (error) {
    console.error('Error creating local shipment:', error);
    return { error: error.message, success: false };
  }
}

