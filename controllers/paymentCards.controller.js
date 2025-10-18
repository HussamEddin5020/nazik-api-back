const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get all payment cards
 * @route   GET /api/v1/payment-cards
 * @access  Private (User only)
 */
const getAllPaymentCards = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const [cards] = await db.query(
    `SELECT 
      id,
      CONCAT('****-****-****-', RIGHT(card_number, 4)) as masked_card_number,
      card_number,
      cvc,
      exp_date,
      CASE 
        WHEN exp_date < CURDATE() THEN 'منتهية الصلاحية'
        WHEN exp_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'تنتهي قريباً'
        ELSE 'صالحة'
      END as status
    FROM payment_cards
    ORDER BY id DESC
    LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );

  // Get total count
  const [countResult] = await db.query('SELECT COUNT(*) as total FROM payment_cards');
  const total = countResult[0].total;

  successResponse(res, {
    cards,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'تم جلب البطاقات بنجاح');
});

/**
 * @desc    Get payment card by ID
 * @route   GET /api/v1/payment-cards/:id
 * @access  Private (User only)
 */
const getPaymentCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [cards] = await db.query(
    `SELECT 
      id,
      CONCAT('****-****-****-', RIGHT(card_number, 4)) as masked_card_number,
      card_number,
      cvc,
      exp_date,
      CASE 
        WHEN exp_date < CURDATE() THEN 'منتهية الصلاحية'
        WHEN exp_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'تنتهي قريباً'
        ELSE 'صالحة'
      END as status
    FROM payment_cards
    WHERE id = ?`,
    [id]
  );

  if (cards.length === 0) {
    return errorResponse(res, 'البطاقة غير موجودة', 404);
  }

  successResponse(res, cards[0], 'تم جلب بيانات البطاقة بنجاح');
});

/**
 * @desc    Create new payment card
 * @route   POST /api/v1/payment-cards
 * @access  Private (User only)
 */
const createPaymentCard = asyncHandler(async (req, res) => {
  const { card_number, cvc, exp_date } = req.body;

  // التحقق من البيانات المطلوبة
  if (!card_number || !cvc || !exp_date) {
    return errorResponse(res, 'جميع البيانات مطلوبة (رقم البطاقة، CVC، تاريخ الانتهاء)', 400);
  }

  // التحقق من صحة رقم البطاقة (16 رقم)
  const cleanCardNumber = card_number.replace(/\D/g, '');
  if (cleanCardNumber.length !== 16) {
    return errorResponse(res, 'رقم البطاقة يجب أن يكون 16 رقم', 400);
  }

  // التحقق من صحة CVC (3 أو 4 أرقام)
  if (cvc.length < 3 || cvc.length > 4) {
    return errorResponse(res, 'CVC يجب أن يكون 3 أو 4 أرقام', 400);
  }

  // التحقق من تاريخ الانتهاء
  const expDate = new Date(exp_date);
  if (expDate < new Date()) {
    return errorResponse(res, 'تاريخ انتهاء البطاقة يجب أن يكون في المستقبل', 400);
  }

  // تنسيق رقم البطاقة
  const formattedCardNumber = cleanCardNumber.replace(/(.{4})/g, '$1-').slice(0, -1);

  const [result] = await db.query(
    'INSERT INTO payment_cards (card_number, cvc, exp_date) VALUES (?, ?, ?)',
    [formattedCardNumber, cvc, exp_date]
  );

  const [card] = await db.query(
    `SELECT 
      id,
      CONCAT('****-****-****-', RIGHT(card_number, 4)) as masked_card_number,
      card_number,
      cvc,
      exp_date
    FROM payment_cards
    WHERE id = ?`,
    [result.insertId]
  );

  successResponse(res, card[0], 'تم إضافة البطاقة بنجاح', 201);
});

/**
 * @desc    Update payment card
 * @route   PUT /api/v1/payment-cards/:id
 * @access  Private (User only)
 */
const updatePaymentCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { card_number, cvc, exp_date } = req.body;

  // التحقق من وجود البطاقة
  const [existingCards] = await db.query('SELECT id FROM payment_cards WHERE id = ?', [id]);
  if (existingCards.length === 0) {
    return errorResponse(res, 'البطاقة غير موجودة', 404);
  }

  const updateFields = [];
  const values = [];

  if (card_number) {
    const cleanCardNumber = card_number.replace(/\D/g, '');
    if (cleanCardNumber.length !== 16) {
      return errorResponse(res, 'رقم البطاقة يجب أن يكون 16 رقم', 400);
    }
    const formattedCardNumber = cleanCardNumber.replace(/(.{4})/g, '$1-').slice(0, -1);
    updateFields.push('card_number = ?');
    values.push(formattedCardNumber);
  }

  if (cvc) {
    if (cvc.length < 3 || cvc.length > 4) {
      return errorResponse(res, 'CVC يجب أن يكون 3 أو 4 أرقام', 400);
    }
    updateFields.push('cvc = ?');
    values.push(cvc);
  }

  if (exp_date) {
    const expDate = new Date(exp_date);
    if (expDate < new Date()) {
      return errorResponse(res, 'تاريخ انتهاء البطاقة يجب أن يكون في المستقبل', 400);
    }
    updateFields.push('exp_date = ?');
    values.push(exp_date);
  }

  if (updateFields.length === 0) {
    return errorResponse(res, 'لا توجد بيانات للتحديث', 400);
  }

  values.push(id);

  await db.query(
    `UPDATE payment_cards SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  );

  const [card] = await db.query(
    `SELECT 
      id,
      CONCAT('****-****-****-', RIGHT(card_number, 4)) as masked_card_number,
      card_number,
      cvc,
      exp_date
    FROM payment_cards
    WHERE id = ?`,
    [id]
  );

  successResponse(res, card[0], 'تم تحديث البطاقة بنجاح');
});

/**
 * @desc    Delete payment card
 * @route   DELETE /api/v1/payment-cards/:id
 * @access  Private (User only)
 */
const deletePaymentCard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // التحقق من وجود البطاقة
  const [existingCards] = await db.query('SELECT id FROM payment_cards WHERE id = ?', [id]);
  if (existingCards.length === 0) {
    return errorResponse(res, 'البطاقة غير موجودة', 404);
  }

  // التحقق من عدم استخدام البطاقة في فواتير
  const [invoices] = await db.query('SELECT id FROM order_invoices WHERE card_id = ? LIMIT 1', [id]);
  if (invoices.length > 0) {
    return errorResponse(res, 'لا يمكن حذف البطاقة لأنها مستخدمة في فواتير', 400);
  }

  await db.query('DELETE FROM payment_cards WHERE id = ?', [id]);

  successResponse(res, null, 'تم حذف البطاقة بنجاح');
});

module.exports = {
  getAllPaymentCards,
  getPaymentCardById,
  createPaymentCard,
  updatePaymentCard,
  deletePaymentCard,
};


