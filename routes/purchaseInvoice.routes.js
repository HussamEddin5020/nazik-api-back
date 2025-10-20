const express = require('express');
const router = express.Router();
const {
  getPurchaseInvoiceByCart,
  uploadPurchaseInvoicePDF,
  getPurchaseInvoicePDF,
  deletePurchaseInvoicePDF,
  getAllPurchaseInvoices
} = require('../controllers/purchaseInvoice.controller');
const { protect, authorize } = require('../middleware/auth');

// جميع المسارات محمية ومتاحة للموظفين فقط
router.use(protect);
router.use(authorize('staff', 'admin'));

// جلب فاتورة الشراء لسلة معينة
router.get('/cart/:cartId', getPurchaseInvoiceByCart);

// رفع ملف PDF لفاتورة الشراء
router.post('/cart/:cartId/upload-pdf', uploadPurchaseInvoicePDF);

// عرض ملف PDF لفاتورة الشراء
router.get('/cart/:cartId/pdf', getPurchaseInvoicePDF);

// حذف ملف PDF لفاتورة الشراء
router.delete('/cart/:cartId/pdf', deletePurchaseInvoicePDF);

// جلب جميع فواتير الشراء
router.get('/', getAllPurchaseInvoices);

module.exports = router;
