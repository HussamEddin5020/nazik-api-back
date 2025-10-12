const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @desc    Get all shipments
 * @route   GET /api/v1/shipments
 * @access  Private (Staff)
 */
exports.getAllShipments = asyncHandler(async (req, res) => {
  const { status_id } = req.query;

  let query = `
    SELECT s.*, 
           ss.name as status_name,
           sc.company_name,
           b.number as box_number
    FROM shipments s
    LEFT JOIN shipment_status ss ON s.status_id = ss.id
    LEFT JOIN shipping_companies sc ON s.company_id = sc.id
    LEFT JOIN box b ON s.box_id = b.id
    WHERE 1=1
  `;

  const params = [];

  if (status_id) {
    query += ' AND s.status_id = ?';
    params.push(status_id);
  }

  query += ' ORDER BY s.id DESC';

  const [shipments] = await db.query(query, params);

  successResponse(res, shipments);
});

/**
 * @desc    Get shipment by ID
 * @route   GET /api/v1/shipments/:id
 * @access  Private (Staff)
 */
exports.getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [shipments] = await db.query(
    `SELECT s.*, 
            ss.name as status_name,
            sc.company_name,
            b.number as box_number
     FROM shipments s
     LEFT JOIN shipment_status ss ON s.status_id = ss.id
     LEFT JOIN shipping_companies sc ON s.company_id = sc.id
     LEFT JOIN box b ON s.box_id = b.id
     WHERE s.id = ?`,
    [id]
  );

  if (shipments.length === 0) {
    return errorResponse(res, 'الشحنة غير موجودة', 404);
  }

  // Get shipment images
  const [images] = await db.query(
    'SELECT id, image_data FROM shipment_images WHERE shipment_id = ?',
    [id]
  );

  const shipmentData = {
    ...shipments[0],
    images
  };

  successResponse(res, shipmentData);
});

/**
 * @desc    Create new shipment
 * @route   POST /api/v1/shipments
 * @access  Private (Staff)
 */
exports.createShipment = asyncHandler(async (req, res) => {
  const { box_id, company_id, sender_name, weight, images = [] } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Create shipment
    const [result] = await connection.query(
      `INSERT INTO shipments (box_id, company_id, sender_name, weight, status_id)
       VALUES (?, ?, ?, ?, 1)`,
      [box_id || null, company_id || null, sender_name, weight]
    );

    const shipmentId = result.insertId;

    // Insert images if provided
    if (images.length > 0) {
      const imageValues = images.map(img => [img, shipmentId]);
      await connection.query(
        'INSERT INTO shipment_images (image_data, shipment_id) VALUES ?',
        [imageValues]
      );
    }

    await connection.commit();

    const [shipment] = await connection.query(
      'SELECT * FROM shipments WHERE id = ?',
      [shipmentId]
    );

    successResponse(res, shipment[0], 'تم إنشاء الشحنة بنجاح', 201);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * @desc    Update shipment status
 * @route   PUT /api/v1/shipments/:id/status
 * @access  Private (Staff)
 */
exports.updateShipmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;

  if (!status_id) {
    return errorResponse(res, 'معرف الحالة مطلوب', 400);
  }

  await db.query(
    'UPDATE shipments SET status_id = ? WHERE id = ?',
    [status_id, id]
  );

  const [shipment] = await db.query(
    `SELECT s.*, ss.name as status_name
     FROM shipments s
     LEFT JOIN shipment_status ss ON s.status_id = ss.id
     WHERE s.id = ?`,
    [id]
  );

  successResponse(res, shipment[0], 'تم تحديث حالة الشحنة بنجاح');
});

module.exports = exports;


