const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const validate = require('../middleware/validator');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('phone').trim().notEmpty().withMessage('رقم الهاتف مطلوب'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('city_id').isInt({ min: 1 }).withMessage('المدينة مطلوبة'),
  body('area_id').isInt({ min: 1 }).withMessage('المنطقة مطلوبة'),
  body('street').optional().trim()
];

const loginValidation = [
  body('identifier').trim().notEmpty().withMessage('البريد الإلكتروني أو رقم الهاتف مطلوب'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
];

// Routes

/**
 * @route   POST /api/v1/auth/register/customer
 * @desc    Register new customer
 * @access  Public
 */
router.post('/register/customer', validate(registerValidation), authController.registerCustomer);

/**
 * @route   POST /api/v1/auth/register/user
 * @desc    Register new user/staff
 * @access  Public (should be protected in production)
 */
router.post('/register/user', validate(registerValidation), authController.registerUser);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user/customer
 * @access  Public
 */
router.post('/login', validate(loginValidation), authController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authController.getCurrentUser);

module.exports = router;


