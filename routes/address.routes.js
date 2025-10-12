const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const { verifyToken } = require('../middleware/auth');

// Public routes (no auth needed for reference data)

/**
 * @route   GET /api/v1/addresses/cities
 * @desc    Get all cities
 * @access  Public
 */
router.get('/cities', addressController.getAllCities);

/**
 * @route   GET /api/v1/addresses/cities/:cityId/areas
 * @desc    Get areas by city ID
 * @access  Public
 */
router.get('/cities/:cityId/areas', addressController.getAreasByCity);

/**
 * @route   GET /api/v1/addresses/areas
 * @desc    Get all areas
 * @access  Public
 */
router.get('/areas', addressController.getAllAreas);

module.exports = router;


