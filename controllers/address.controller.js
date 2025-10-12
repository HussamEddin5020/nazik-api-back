const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/helpers');

/**
 * @desc    Get all cities
 * @route   GET /api/v1/addresses/cities
 * @access  Public
 */
exports.getAllCities = asyncHandler(async (req, res) => {
  const [cities] = await db.query(
    'SELECT * FROM cities ORDER BY name ASC'
  );

  successResponse(res, cities);
});

/**
 * @desc    Get areas by city ID
 * @route   GET /api/v1/addresses/cities/:cityId/areas
 * @access  Public
 */
exports.getAreasByCity = asyncHandler(async (req, res) => {
  const { cityId } = req.params;

  const [areas] = await db.query(
    'SELECT * FROM areas WHERE city_id = ? ORDER BY name ASC',
    [cityId]
  );

  successResponse(res, areas);
});

/**
 * @desc    Get all areas
 * @route   GET /api/v1/addresses/areas
 * @access  Public
 */
exports.getAllAreas = asyncHandler(async (req, res) => {
  const [areas] = await db.query(
    `SELECT a.*, c.name as city_name
     FROM areas a
     JOIN cities c ON a.city_id = c.id
     ORDER BY c.name, a.name ASC`
  );

  successResponse(res, areas);
});

module.exports = exports;


