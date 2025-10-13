const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get treasury balance
 * @route   GET /api/v1/treasury/balance
 * @access  Private (User only)
 */
const getTreasuryBalance = asyncHandler(async (req, res) => {
  // Get main treasury
  const [treasury] = await db.query('SELECT * FROM try_treasury ORDER BY id DESC LIMIT 1');
  
  // Get treasury details
  const [details] = await db.query('SELECT * FROM try_treasury_details ORDER BY id DESC LIMIT 1');

  const treasuryData = {
    main_treasury: treasury.length > 0 ? treasury[0] : { id: null, current_value: 0 },
    details: details.length > 0 ? details[0] : { id: null, card_amount: 0, cash_amount: 0 },
    total_balance: 0
  };

  if (details.length > 0) {
    treasuryData.total_balance = parseFloat(details[0].card_amount) + parseFloat(details[0].cash_amount);
  }

  successResponse(res, treasuryData, 'تم جلب رصيد الخزينة بنجاح');
});

/**
 * @desc    Update treasury balance
 * @route   PUT /api/v1/treasury/balance
 * @access  Private (User only)
 */
const updateTreasuryBalance = asyncHandler(async (req, res) => {
  const { card_amount, cash_amount, current_value } = req.body;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Update main treasury
    if (current_value !== undefined) {
      const [existingTreasury] = await connection.query('SELECT id FROM try_treasury ORDER BY id DESC LIMIT 1');
      
      if (existingTreasury.length > 0) {
        await connection.query(
          'UPDATE try_treasury SET current_value = ? WHERE id = ?',
          [current_value, existingTreasury[0].id]
        );
      } else {
        await connection.query(
          'INSERT INTO try_treasury (current_value) VALUES (?)',
          [current_value]
        );
      }
    }

    // Update treasury details
    if (card_amount !== undefined || cash_amount !== undefined) {
      const [existingDetails] = await connection.query('SELECT id FROM try_treasury_details ORDER BY id DESC LIMIT 1');
      
      if (existingDetails.length > 0) {
        const updateFields = [];
        const values = [];
        
        if (card_amount !== undefined) {
          updateFields.push('card_amount = ?');
          values.push(card_amount);
        }
        
        if (cash_amount !== undefined) {
          updateFields.push('cash_amount = ?');
          values.push(cash_amount);
        }
        
        values.push(existingDetails[0].id);
        
        await connection.query(
          `UPDATE try_treasury_details SET ${updateFields.join(', ')} WHERE id = ?`,
          values
        );
      } else {
        await connection.query(
          'INSERT INTO try_treasury_details (card_amount, cash_amount) VALUES (?, ?)',
          [card_amount || 0, cash_amount || 0]
        );
      }
    }

    await connection.commit();

    // Return updated balance
    const [updatedTreasury] = await db.query('SELECT * FROM try_treasury ORDER BY id DESC LIMIT 1');
    const [updatedDetails] = await db.query('SELECT * FROM try_treasury_details ORDER BY id DESC LIMIT 1');

    const treasuryData = {
      main_treasury: updatedTreasury.length > 0 ? updatedTreasury[0] : { id: null, current_value: 0 },
      details: updatedDetails.length > 0 ? updatedDetails[0] : { id: null, card_amount: 0, cash_amount: 0 },
      total_balance: 0
    };

    if (updatedDetails.length > 0) {
      treasuryData.total_balance = parseFloat(updatedDetails[0].card_amount) + parseFloat(updatedDetails[0].cash_amount);
    }

    successResponse(res, treasuryData, 'تم تحديث رصيد الخزينة بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Add money to treasury
 * @route   POST /api/v1/treasury/add
 * @access  Private (User only)
 */
const addMoneyToTreasury = asyncHandler(async (req, res) => {
  const { amount, type } = req.body; // type: 'card' or 'cash'

  if (!amount || amount <= 0) {
    return errorResponse(res, 'المبلغ يجب أن يكون أكبر من صفر', 400);
  }

  if (!type || !['card', 'cash'].includes(type)) {
    return errorResponse(res, 'نوع العملية يجب أن يكون card أو cash', 400);
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get current treasury details
    const [existingDetails] = await connection.query('SELECT * FROM try_treasury_details ORDER BY id DESC LIMIT 1');
    
    if (existingDetails.length > 0) {
      const currentAmount = type === 'card' ? 
        parseFloat(existingDetails[0].card_amount) : 
        parseFloat(existingDetails[0].cash_amount);
      
      const newAmount = currentAmount + parseFloat(amount);
      
      if (type === 'card') {
        await connection.query(
          'UPDATE try_treasury_details SET card_amount = ? WHERE id = ?',
          [newAmount, existingDetails[0].id]
        );
      } else {
        await connection.query(
          'UPDATE try_treasury_details SET cash_amount = ? WHERE id = ?',
          [newAmount, existingDetails[0].id]
        );
      }
    } else {
      // Create new treasury details
      const cardAmount = type === 'card' ? parseFloat(amount) : 0;
      const cashAmount = type === 'cash' ? parseFloat(amount) : 0;
      
      await connection.query(
        'INSERT INTO try_treasury_details (card_amount, cash_amount) VALUES (?, ?)',
        [cardAmount, cashAmount]
      );
    }

    await connection.commit();

    successResponse(res, {
      amount_added: parseFloat(amount),
      type,
      message: `تم إضافة ${amount} د.ل إلى رصيد ${type === 'card' ? 'البطاقة' : 'النقد'} بنجاح`
    }, 'تم إضافة المبلغ بنجاح');

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Get treasury transaction history
 * @route   GET /api/v1/treasury/history
 * @access  Private (User only)
 */
const getTreasuryHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Get recent invoices that affected treasury
  const [invoices] = await db.query(
    `SELECT 
      oi.id,
      oi.invoice_number,
      oi.total_amount,
      oi.payment_method,
      oi.cash_amount,
      oi.card_paid_amount,
      oi.created_at as transaction_date,
      o.title as order_title,
      'payment' as transaction_type
    FROM order_invoices oi
    INNER JOIN orders o ON o.id = oi.order_id
    ORDER BY oi.created_at DESC
    LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );

  // Get total count
  const [countResult] = await db.query('SELECT COUNT(*) as total FROM order_invoices');
  const total = countResult[0].total;

  successResponse(res, {
    transactions: invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'تم جلب سجل المعاملات بنجاح');
});

module.exports = {
  getTreasuryBalance,
  updateTreasuryBalance,
  addMoneyToTreasury,
  getTreasuryHistory,
};
