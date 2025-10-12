const express = require('express');
const router = express.Router();
const boxController = require('../controllers/box.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/boxes
 * @desc    Get all boxes
 * @access  Private (Staff)
 */
router.get('/', boxController.getAllBoxes);

/**
 * @route   GET /api/v1/boxes/:id
 * @desc    Get box by ID
 * @access  Private (Staff)
 */
router.get('/:id', boxController.getBoxById);

/**
 * @route   POST /api/v1/boxes
 * @desc    Create new box
 * @access  Private (Staff)
 */
router.post('/', boxController.createBox);

/**
 * @route   PUT /api/v1/boxes/:id
 * @desc    Update box
 * @access  Private (Staff)
 */
router.put('/:id', boxController.updateBox);

module.exports = router;


