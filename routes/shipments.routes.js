const express = require('express');
const router = express.Router();
const {
  getAllShipments,
  getShipmentById,
  createShipment,
  sendShipment,
  deliverShipment,
  getDeliveredShipments,
  openBox,
  getBoxOrders,
  getClosedBoxes,
  getShippingCompanies,
} = require('../controllers/shipments.controller');
const { verifyToken } = require('../middleware/auth');

// Middleware للتحقق من أن المستخدم هو user وليس customer
const checkUserType = (req, res, next) => {
  if (req.user.type !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول إلى هذا المورد',
    });
  }
  next();
};

// Apply authentication and user type check to all routes
router.use(verifyToken);
router.use(checkUserType);

// Routes
router.get('/', getAllShipments);
router.get('/delivered', getDeliveredShipments);
router.get('/closed-boxes', getClosedBoxes);
router.get('/companies', getShippingCompanies);
router.get('/:id', getShipmentById);
router.post('/', createShipment);
router.put('/:id/send', sendShipment);
router.put('/:id/deliver', deliverShipment);
router.put('/:id/open-box', openBox);
router.get('/:id/box-orders', getBoxOrders);

module.exports = router;
