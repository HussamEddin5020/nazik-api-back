const axios = require('axios');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

// Darb Assabil API Configuration
const DARB_ASSABIL_BASE_URL = 'https://v2.sabil.ly';
// Bearer token from Postman: eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXRJZCI6IjY4ZmY5YWNlZjgwNzFmZTNiYTAwMmQ4OSIsInN1YiI6Im9hdXRoX3NlY3JldCIsImlzcyI6IkRhcmIgQXNzYWJpbCIsImF1ZCI6IkRhcmIgQXNzYWJpbCIsImlhdCI6MTc2MTU4MTc3NCwiZXhwIjoxNzgwMTc0Nzk5LjQ4NX0.SsFnN2kp7TgQHcR0gWWHEvxUj5UGEnr9jcFMFLXK0vk
const DARB_ASSABIL_API_KEY = process.env.DARB_ASSABIL_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXRJZCI6IjY4ZmY5YWNlZjgwNzFmZTNiYTAwMmQ4OSIsInN1YiI6Im9hdXRoX3NlY3JldCIsImlzcyI6IkRhcmIgQXNzYWJpbCIsImF1ZCI6IkRhcmIgQXNzYWJpbCIsImlhdCI6MTc2MTU4MTc3NCwiZXhwIjoxNzgwMTc0Nzk5LjQ4NX0.SsFnN2kp7TgQHcR0gWWHEvxUj5UGEnr9jcFMFLXK0vk';
const DARB_ASSABIL_API_VERSION = '1.0.0';
const DARB_ASSABIL_ACCOUNT_ID = process.env.DARB_ASSABIL_ACCOUNT_ID || '684addf0deb7b1dc13092829';

/**
 * @desc    Get contacts/customers from Darb Assabil API
 * @route   GET /api/v1/darb-assabil/contacts
 * @access  Private (Staff with create_orders permission)
 */
exports.getContacts = asyncHandler(async (req, res) => {
  const { search, phone, limit = 100 } = req.query;

  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
    });

    if (search) {
      queryParams.append('search', search);
    }

    if (phone) {
      queryParams.append('phone', phone);
    }

    const url = `${DARB_ASSABIL_BASE_URL}/api/contacts?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `apikey ${DARB_ASSABIL_API_KEY}`, // Format: apikey <token>
        'X-API-VERSION': DARB_ASSABIL_API_VERSION,
        'X-ACCOUNT-ID': DARB_ASSABIL_ACCOUNT_ID,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // نستقبل أي status code
    });

    if (response.status < 200 || response.status >= 300) {
      const errorText = response.data ? JSON.stringify(response.data) : response.statusText;
      console.error('Darb Assabil API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = response.data;

    if (data.status === false) {
      return errorResponse(res, data.messages?.[0]?.message || 'خطأ من API درب السبيل', 400);
    }

    successResponse(res, data.data || data);
  } catch (error) {
    console.error('Error fetching contacts from Darb Assabil:', error);
    
    if (error.message.includes('HTTP error')) {
      const statusMatch = error.message.match(/status: (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      return errorResponse(res, `خطأ من API درب السبيل: ${status}`, status);
    }
    
    return errorResponse(res, 'حدث خطأ أثناء جلب قائمة العملاء من API درب السبيل', 500);
  }
});

/**
 * @desc    Verify customer exists in local database by phone
 * @route   POST /api/v1/darb-assabil/verify-customer
 * @access  Private (Staff with create_orders permission)
 */
exports.verifyCustomer = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return errorResponse(res, 'رقم الهاتف مطلوب', 400);
  }

  const db = require('../config/database');

  try {
    // Search for customer by phone in users table
    const [users] = await db.query(
      `SELECT u.id as user_id, u.name, u.email, u.phone, u.type, u.status,
              c.id as customer_id
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.phone = ? AND u.type = 'customer'`,
      [phone]
    );

    if (users.length === 0) {
      return successResponse(res, {
        exists: false,
        message: 'الزبون لا يمتلك لدينا حساب. اطلب منه إنشاء حساب جديد بنفس رقم الهاتف المدرج لدى شركة درب السبيل أو codex',
      });
    }

    const customer = users[0];

    successResponse(res, {
      exists: true,
      customer: {
        customer_id: customer.customer_id,
        user_id: customer.user_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
      },
    });
  } catch (error) {
    console.error('Error verifying customer:', error);
    return errorResponse(res, 'حدث خطأ أثناء التحقق من العميل', 500);
  }
});

