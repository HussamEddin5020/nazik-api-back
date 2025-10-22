const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/invoices
 * @desc    Get all invoices
 * @access  Private (manage_invoices permission)
 */
router.get('/', hasPermission('manage_invoices'), invoiceController.getAllInvoices);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private (manage_invoices permission)
 */
router.get('/:id', hasPermission('manage_invoices'), invoiceController.getInvoiceById);

/**
 * @route   POST /api/v1/invoices
 * @desc    Create new invoice
 * @access  Private (manage_invoices permission)
 */
router.post('/', hasPermission('manage_invoices'), invoiceController.createInvoice);

/**
 * @route   GET /api/v1/invoices/cart/:cartId
 * @desc    Get cart invoices report
 * @access  Private (manage_invoices permission)
 */
router.get('/cart/:cartId', hasPermission('manage_invoices'), invoiceController.getCartInvoices);

module.exports = router;


