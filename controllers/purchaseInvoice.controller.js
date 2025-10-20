const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    جلب فاتورة الشراء للسلة
 * @route   GET /api/v1/purchase-invoices/cart/:cartId
 * @access  Private
 */
exports.getPurchaseInvoiceByCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  console.log(`📄 جلب فاتورة الشراء للسلة ${cartId}`);

  const [invoices] = await db.query(
    `SELECT 
      pi.id,
      pi.cart_id,
      pi.total,
      pi.invoice_image_base64,
      c.orders_count,
      c.is_available as cart_is_available
     FROM purchase_invoices pi
     LEFT JOIN cart c ON pi.cart_id = c.id
     WHERE pi.cart_id = ?`,
    [cartId]
  );

  if (invoices.length === 0) {
    return errorResponse(res, 'فاتورة الشراء غير موجودة لهذه السلة', 404);
  }

  const invoice = invoices[0];

  successResponse(res, {
    invoice: {
      id: invoice.id,
      cart_id: invoice.cart_id,
      total: invoice.total,
      invoice_image_base64: invoice.invoice_image_base64,
      cart_info: {
        orders_count: invoice.orders_count,
        is_available: invoice.cart_is_available
      }
    }
  }, 'تم جلب فاتورة الشراء بنجاح');
});

/**
 * @desc    رفع ملف PDF لفاتورة الشراء (Base64)
 * @route   POST /api/v1/purchase-invoices/cart/:cartId/upload-pdf
 * @access  Private
 */
exports.uploadPurchaseInvoicePDF = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { pdf_base64 } = req.body;

  console.log(`📤 رفع ملف PDF لفاتورة الشراء للسلة ${cartId}`);

  // التحقق من وجود pdf_base64
  if (!pdf_base64) {
    return errorResponse(res, 'يجب إرسال pdf_base64 في الطلب', 400);
  }

  // التحقق من صيغة base64 صحيحة
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Regex.test(pdf_base64)) {
    return errorResponse(res, 'صيغة Base64 غير صحيحة', 400);
  }

  // التحقق من وجود فاتورة الشراء للسلة
  const [existingInvoice] = await db.query(
    'SELECT id FROM purchase_invoices WHERE cart_id = ?',
    [cartId]
  );

  if (existingInvoice.length === 0) {
    return errorResponse(res, 'فاتورة الشراء غير موجودة لهذه السلة', 404);
  }

  // تحديث قاعدة البيانات
  await db.query(
    'UPDATE purchase_invoices SET invoice_image_base64 = ? WHERE cart_id = ?',
    [pdf_base64, cartId]
  );

  console.log(`✅ تم رفع ملف PDF لفاتورة الشراء للسلة ${cartId}`);

  successResponse(res, {
    message: 'تم رفع ملف PDF بنجاح',
    cart_id: cartId,
    pdf_size_bytes: Math.ceil((pdf_base64.length * 3) / 4) // تقدير حجم الملف من base64
  }, 'تم رفع ملف PDF بنجاح');
});

/**
 * @desc    عرض ملف PDF لفاتورة الشراء
 * @route   GET /api/v1/purchase-invoices/cart/:cartId/pdf
 * @access  Private
 */
exports.getPurchaseInvoicePDF = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  console.log(`📖 عرض ملف PDF لفاتورة الشراء للسلة ${cartId}`);

  const [invoices] = await db.query(
    'SELECT invoice_image_base64 FROM purchase_invoices WHERE cart_id = ? AND invoice_image_base64 IS NOT NULL',
    [cartId]
  );

  if (invoices.length === 0) {
    return errorResponse(res, 'ملف PDF غير موجود لهذه السلة', 404);
  }

  const invoice = invoices[0];

  // إرسال الملف كـ PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="cart_${cartId}_invoice.pdf"`);
  
  // تحويل base64 إلى buffer وإرساله
  const pdfBuffer = Buffer.from(invoice.invoice_image_base64, 'base64');
  res.send(pdfBuffer);
});

/**
 * @desc    حذف ملف PDF لفاتورة الشراء
 * @route   DELETE /api/v1/purchase-invoices/cart/:cartId/pdf
 * @access  Private
 */
exports.deletePurchaseInvoicePDF = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  console.log(`🗑️ حذف ملف PDF لفاتورة الشراء للسلة ${cartId}`);

  const [result] = await db.query(
    'UPDATE purchase_invoices SET invoice_image_base64 = NULL WHERE cart_id = ?',
    [cartId]
  );

  if (result.affectedRows === 0) {
    return errorResponse(res, 'فاتورة الشراء غير موجودة لهذه السلة', 404);
  }

  console.log(`✅ تم حذف ملف PDF لفاتورة الشراء للسلة ${cartId}`);

  successResponse(res, {
    message: 'تم حذف ملف PDF بنجاح',
    cart_id: cartId
  }, 'تم حذف ملف PDF بنجاح');
});

/**
 * @desc    جلب جميع فواتير الشراء مع تفاصيل السلات
 * @route   GET /api/v1/purchase-invoices
 * @access  Private
 */
exports.getAllPurchaseInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  console.log(`📋 جلب جميع فواتير الشراء - صفحة ${page}`);

  let query = `
    SELECT 
      pi.id,
      pi.cart_id,
      pi.total,
      pi.invoice_image_base64,
      c.orders_count,
      c.is_available as cart_is_available,
      COUNT(o.id) as actual_orders_count
    FROM purchase_invoices pi
    LEFT JOIN cart c ON pi.cart_id = c.id
    LEFT JOIN orders o ON o.cart_id = c.id AND o.is_active = 1
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    query += ' AND (pi.cart_id LIKE ? OR pi.total LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += `
    GROUP BY pi.id, pi.cart_id, pi.total, pi.invoice_image_base64, c.orders_count, c.is_available
    ORDER BY pi.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), offset);

  const [invoices] = await db.query(query, params);

  // جلب العدد الإجمالي
  let countQuery = `
    SELECT COUNT(*) as total
    FROM purchase_invoices pi
    WHERE 1=1
  `;

  const countParams = [];

  if (search) {
    countQuery += ' AND (pi.cart_id LIKE ? OR pi.total LIKE ?)';
    const searchTerm = `%${search}%`;
    countParams.push(searchTerm, searchTerm);
  }

  const [countResult] = await db.query(countQuery, countParams);
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  successResponse(res, {
    invoices: invoices.map(invoice => ({
      id: invoice.id,
      cart_id: invoice.cart_id,
      total: invoice.total,
      invoice_image_base64: invoice.invoice_image_base64,
      cart_info: {
        orders_count: invoice.orders_count,
        actual_orders_count: invoice.actual_orders_count,
        is_available: invoice.cart_is_available
      }
    })),
    pagination: {
      current_page: parseInt(page),
      total_pages: totalPages,
      total_items: total,
      items_per_page: parseInt(limit)
    }
  }, 'تم جلب فواتير الشراء بنجاح');
});

module.exports = exports;
