const express = require('express');
const router = express.Router();
const treasuryController = require('../controllers/treasury.controller');
const { verifyToken } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/treasury
 * @desc    Get all treasuries
 * @access  Private (Staff with view_finance permission)
 */
router.get('/', checkPermissionNew('view_finance'), treasuryController.getAllTreasuries);

/**
 * @route   GET /api/v1/treasury/libyan
 * @desc    Get Libyan treasury balance
 * @access  Private (Staff with view_finance permission)
 */
router.get('/libyan', checkPermissionNew('view_finance'), treasuryController.getLibyanTreasury);

/**
 * @route   GET /api/v1/treasury/turkish
 * @desc    Get Turkish treasury balance and details
 * @access  Private (Staff with view_finance permission)
 */
router.get('/turkish', checkPermissionNew('view_finance'), treasuryController.getTurkishTreasury);

/**
 * @route   PUT /api/v1/treasury/libyan
 * @desc    Update Libyan treasury value
 * @access  Private (Staff with manage_finance permission)
 */
router.put('/libyan', checkPermissionNew('manage_finance'), treasuryController.updateLibyanTreasury);

/**
 * @route   POST /api/v1/treasury/convert
 * @desc    Convert Libyan treasury to Turkish
 * @access  Private (Staff with manage_finance permission)
 */
router.post('/convert', checkPermissionNew('manage_finance'), treasuryController.convertCurrency);

/**
 * @route   PUT /api/v1/treasury/turkish/redistribute
 * @desc    Redistribute Turkish treasury between cards and cash
 * @access  Private (Staff with manage_finance permission)
 */
router.put('/turkish/redistribute', checkPermissionNew('manage_finance'), treasuryController.redistributeTurkish);

module.exports = router;
