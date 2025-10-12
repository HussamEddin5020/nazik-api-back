const { validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const extractedErrors = [];
    errors.array().map(err => {
      extractedErrors.push({
        field: err.param,
        message: err.msg
      });
    });

    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: extractedErrors
    });
  };
};

module.exports = validate;


