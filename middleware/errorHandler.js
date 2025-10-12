const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'حدث خطأ في الخادم';

  // Handle specific errors
  
  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'هذا السجل موجود مسبقاً';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 404;
    message = 'السجل المرجعي غير موجود';
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    message = 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'رمز التفويض غير صالح';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'انتهت صلاحية رمز التفويض';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
};

module.exports = errorHandler;


