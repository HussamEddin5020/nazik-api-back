const { body } = require('express-validator');

const registerCustomerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 100 })
    .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('البريد الإلكتروني غير صالح')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('رقم الهاتف مطلوب')
    .matches(/^(091|092|093|094|095)\d{7}$/)
    .withMessage('رقم الهاتف غير صالح (مثال: 0912345678)'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  
  body('city_id')
    .isInt({ min: 1 })
    .withMessage('المدينة مطلوبة'),
  
  body('area_id')
    .isInt({ min: 1 })
    .withMessage('المنطقة مطلوبة'),
  
  body('street')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('الشارع يجب ألا يتجاوز 150 حرف')
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('البريد الإلكتروني أو رقم الهاتف مطلوب'),
  
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('رمز التحديث مطلوب')
];

module.exports = {
  registerCustomerValidation,
  loginValidation,
  refreshTokenValidation
};


