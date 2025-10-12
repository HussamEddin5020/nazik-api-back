const { body, param, query } = require('express-validator');

const createOrderValidation = [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('معرف العميل مطلوب'),
  
  body('position_id')
    .optional()
    .isInt({ min: 1, max: 16 })
    .withMessage('معرف الحالة غير صالح'),
  
  body('details')
    .optional()
    .isObject()
    .withMessage('تفاصيل الطلب يجب أن تكون كائن'),
  
  body('details.title')
    .if(body('details').exists())
    .notEmpty()
    .withMessage('عنوان المنتج مطلوب')
    .isLength({ max: 255 })
    .withMessage('عنوان المنتج طويل جداً'),
  
  body('details.prepaid_value')
    .optional()
    .isDecimal()
    .withMessage('القيمة المدفوعة مقدماً يجب أن تكون رقم'),
  
  body('details.original_product_price')
    .optional()
    .isDecimal()
    .withMessage('سعر المنتج يجب أن تكون رقم'),
  
  body('details.commission')
    .optional()
    .isDecimal()
    .withMessage('العمولة يجب أن تكون رقم'),
  
  body('details.total')
    .optional()
    .isDecimal()
    .withMessage('الإجمالي يجب أن يكون رقم')
];

const updateOrderPositionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('معرف الطلب غير صالح'),
  
  body('position_id')
    .isInt({ min: 1, max: 16 })
    .withMessage('معرف الحالة مطلوب ويجب أن يكون بين 1 و 16'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('السبب طويل جداً'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('الملاحظات طويلة جداً')
];

const getOrderByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('معرف الطلب غير صالح')
];

module.exports = {
  createOrderValidation,
  updateOrderPositionValidation,
  getOrderByIdValidation
};


