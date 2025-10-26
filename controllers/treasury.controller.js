const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

// TODO: سعر الصرف الحالي ثابت، سيتم تحويله لـ API يحصل على السعر الفعلي لاحقاً
const EXCHANGE_RATE = 3.8; // 1 LYD = 3.8 TRY

/**
 * @desc    Get Libyan treasury balance
 * @route   GET /api/v1/treasury/libyan
 * @access  Private (Staff with manage_finance permission)
 */
exports.getLibyanTreasury = asyncHandler(async (req, res) => {
  const [treasury] = await db.query(
    'SELECT * FROM lyd_treasury WHERE id = 1'
  );

  if (treasury.length === 0) {
    return errorResponse(res, 'الخزينة الليبية غير موجودة', 404);
  }

  successResponse(res, treasury[0], 'تم جلب بيانات الخزينة الليبية بنجاح');
});

/**
 * @desc    Get Turkish treasury balance and details
 * @route   GET /api/v1/treasury/turkish
 * @access  Private (Staff with manage_finance permission)
 */
exports.getTurkishTreasury = asyncHandler(async (req, res) => {
  const [treasury] = await db.query(
    'SELECT * FROM try_treasury WHERE id = 1'
  );

  const [details] = await db.query(
    'SELECT * FROM try_treasury_details WHERE id = 1'
  );

  if (treasury.length === 0 || details.length === 0) {
    return errorResponse(res, 'الخزينة التركية غير موجودة', 404);
  }

  successResponse(res, {
    current_value: treasury[0].current_value,
    card_amount: details[0].card_amount,
    cash_amount: details[0].cash_amount,
  }, 'تم جلب بيانات الخزينة التركية بنجاح');
});

/**
 * @desc    Update Libyan treasury value
 * @route   PUT /api/v1/treasury/libyan
 * @access  Private (Staff with manage_finance permission)
 */
exports.updateLibyanTreasury = asyncHandler(async (req, res) => {
  const { value } = req.body;

  if (value === undefined || value < 0) {
    return errorResponse(res, 'القيمة غير صحيحة', 400);
  }

  // Check if treasury exists, create if not
  const [existing] = await db.query(
    'SELECT * FROM lyd_treasury WHERE id = 1'
  );

  if (existing.length === 0) {
    // Create new treasury
    await db.query(
      'INSERT INTO lyd_treasury (id, current_value) VALUES (1, ?)',
      [value]
    );
  } else {
    // Update existing treasury
    await db.query(
      'UPDATE lyd_treasury SET current_value = ? WHERE id = 1',
      [value]
    );
  }

  const [updated] = await db.query(
    'SELECT * FROM lyd_treasury WHERE id = 1'
  );

  successResponse(res, updated[0], 'تم تحديث الخزينة الليبية بنجاح');
});

/**
 * @desc    Convert Libyan treasury to Turkish
 * @route   POST /api/v1/treasury/convert
 * @access  Private (Staff with manage_finance permission)
 */
exports.convertCurrency = asyncHandler(async (req, res) => {
  const { amount_lyd } = req.body;

  if (amount_lyd === undefined || amount_lyd <= 0) {
    return errorResponse(res, 'المبلغ غير صحيح', 400);
  }

  // Get current Libyan treasury
  const [libyanTreasury] = await db.query(
    'SELECT * FROM lyd_treasury WHERE id = 1'
  );

  if (libyanTreasury.length === 0) {
    return errorResponse(res, 'الخزينة الليبية غير موجودة', 404);
  }

  const currentLibyanValue = parseFloat(libyanTreasury[0].current_value);

  if (currentLibyanValue < amount_lyd) {
    return errorResponse(res, 'الرصيد غير كاف في الخزينة الليبية', 400);
  }

  const amount_try = amount_lyd * EXCHANGE_RATE;

  // Update Libyan treasury (subtract)
  const newLibyanValue = currentLibyanValue - amount_lyd;
  await db.query(
    'UPDATE lyd_treasury SET current_value = ? WHERE id = 1',
    [newLibyanValue]
  );

  // Update Turkish treasury (add)
  const [turkishTreasury] = await db.query(
    'SELECT * FROM try_treasury WHERE id = 1'
  );

  let newTurkishValue;
  if (turkishTreasury.length === 0) {
    // Create new treasury
    await db.query(
      'INSERT INTO try_treasury (id, current_value) VALUES (1, ?)',
      [amount_try]
    );
    newTurkishValue = amount_try;
  } else {
    const currentTurkishValue = parseFloat(turkishTreasury[0].current_value);
    newTurkishValue = currentTurkishValue + amount_try;
    await db.query(
      'UPDATE try_treasury SET current_value = ? WHERE id = 1',
      [newTurkishValue]
    );
  }

  // Get Turkish treasury details
  const [turkishDetails] = await db.query(
    'SELECT * FROM try_treasury_details WHERE id = 1'
  );

  if (turkishDetails.length === 0) {
    // Create new details (default: all in cash)
    await db.query(
      'INSERT INTO try_treasury_details (id, card_amount, cash_amount) VALUES (1, 0, ?)',
      [amount_try]
    );
  } else {
    // Add to cash by default
    const currentCash = parseFloat(turkishDetails[0].cash_amount);
    const newCash = currentCash + amount_try;
    await db.query(
      'UPDATE try_treasury_details SET cash_amount = ? WHERE id = 1',
      [newCash]
    );
  }

  successResponse(res, {
    amount_lyd,
    amount_try,
    exchange_rate: EXCHANGE_RATE,
    libyan_new_value: newLibyanValue,
    turkish_new_value: newTurkishValue,
  }, 'تم التحويل بنجاح');
});

/**
 * @desc    Redistribute Turkish treasury (between cards and cash)
 * @route   PUT /api/v1/treasury/turkish/redistribute
 * @access  Private (Staff with manage_finance permission)
 */
exports.redistributeTurkish = asyncHandler(async (req, res) => {
  const { card_amount, cash_amount } = req.body;

  if (card_amount === undefined || cash_amount === undefined) {
    return errorResponse(res, 'يجب تحديد مبالغ البطاقة والنقد', 400);
  }

  if (card_amount < 0 || cash_amount < 0) {
    return errorResponse(res, 'المبالغ يجب أن تكون موجبة', 400);
  }

  const total = parseFloat(card_amount) + parseFloat(cash_amount);

  // Get current Turkish treasury
  const [turkishTreasury] = await db.query(
    'SELECT * FROM try_treasury WHERE id = 1'
  );

  if (turkishTreasury.length === 0) {
    return errorResponse(res, 'الخزينة التركية غير موجودة', 404);
  }

  const currentTurkishValue = parseFloat(turkishTreasury[0].current_value);

  // Validate total matches treasury value (with small tolerance)
  if (Math.abs(total - currentTurkishValue) > 0.01) {
    return errorResponse(res, 
      `إجمالي المبالغ (${total}) لا يطابق قيمة الخزينة (${currentTurkishValue})`, 
      400
    );
  }

  // Update details
  await db.query(
    'UPDATE try_treasury_details SET card_amount = ?, cash_amount = ? WHERE id = 1',
    [card_amount, cash_amount]
  );

  const [updatedDetails] = await db.query(
    'SELECT * FROM try_treasury_details WHERE id = 1'
  );

  successResponse(res, {
    card_amount: updatedDetails[0].card_amount,
    cash_amount: updatedDetails[0].cash_amount,
    total: updatedDetails[0].card_amount + updatedDetails[0].cash_amount,
  }, 'تم إعادة توزيع الخزينة التركية بنجاح');
});

/**
 * @desc    Get all treasury balances
 * @route   GET /api/v1/treasury
 * @access  Private (Staff with manage_finance permission)
 */
exports.getAllTreasuries = asyncHandler(async (req, res) => {
  const [libyanTreasury] = await db.query(
    'SELECT * FROM lyd_treasury WHERE id = 1'
  );

  const [turkishTreasury] = await db.query(
    'SELECT * FROM try_treasury WHERE id = 1'
  );

  const [turkishDetails] = await db.query(
    'SELECT * FROM try_treasury_details WHERE id = 1'
  );

  const response = {
    libyan: libyanTreasury[0] || { id: 1, current_value: '0.00' },
    turkish: turkishTreasury[0] || { id: 1, current_value: '0.00' },
    turkish_details: turkishDetails[0] || { id: 1, card_amount: '0.00', cash_amount: '0.00' },
    exchange_rate: EXCHANGE_RATE,
  };

  successResponse(res, response, 'تم جلب بيانات جميع الخزائن بنجاح');
});

module.exports = exports;
