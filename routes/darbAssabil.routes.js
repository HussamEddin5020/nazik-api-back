const express = require('express');
const router = express.Router();
const darbAssabilController = require('../controllers/darbAssabil.controller');
const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/darb-assabil/contacts
 * @desc    Get contacts/customers from Darb Assabil API
 * @access  Private (Staff with create_orders permission)
 */
router.get('/contacts', isStaff, checkPermissionNew('create_orders'), darbAssabilController.getContacts);

/**
 * @route   POST /api/v1/darb-assabil/verify-customer
 * @desc    Verify customer exists in local database by phone
 * @access  Private (Staff with create_orders permission)
 */
router.post('/verify-customer', isStaff, checkPermissionNew('create_orders'), darbAssabilController.verifyCustomer);

module.exports = router;

