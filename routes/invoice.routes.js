const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/invoices
 * @desc    Get all invoices
 * @access  Private (Staff)
 */
router.get('/', invoiceController.getAllInvoices);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private (Staff)
 */
router.get('/:id', invoiceController.getInvoiceById);

/**
 * @route   POST /api/v1/invoices
 * @desc    Create new invoice
 * @access  Private (Staff)
 */
router.post('/', invoiceController.createInvoice);

/**
 * @route   GET /api/v1/invoices/cart/:cartId
 * @desc    Get cart invoices report
 * @access  Private (Staff)
 */
router.get('/cart/:cartId', invoiceController.getCartInvoices);

module.exports = router;


