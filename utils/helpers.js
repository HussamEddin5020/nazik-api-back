/**
 * Helper functions for the application
 */

// Generate unique ID with prefix
const generateId = (prefix, length = 10) => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, length);
  return `${prefix}-${timestamp}${random}`;
};

// Format success response
const successResponse = (res, data, message = 'تمت العملية بنجاح', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Format error response
const errorResponse = (res, message = 'حدث خطأ', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Format date to MySQL datetime
const formatDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Calculate pagination
const getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset: parseInt(offset) };
};

// Build pagination response
const buildPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Sanitize user object (remove sensitive data)
const sanitizeUser = (user) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};

// Format order number
const formatOrderNumber = (orderId) => {
  return `ORD-${orderId}`;
};

// Format cart number
const formatCartNumber = (cartId) => {
  return `CART-${cartId}`;
};

// Format box number
const formatBoxNumber = (boxNumber) => {
  return `BX-${boxNumber}`;
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Libyan format)
const isValidPhone = (phone) => {
  const phoneRegex = /^(091|092|093|094|095)\d{7}$/;
  return phoneRegex.test(phone);
};

// Extract error message from database error
const extractDBError = (error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    if (error.message.includes('email')) {
      return 'البريد الإلكتروني مستخدم مسبقاً';
    }
    if (error.message.includes('phone')) {
      return 'رقم الهاتف مستخدم مسبقاً';
    }
    return 'هذا السجل موجود مسبقاً';
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return 'السجل المرجعي غير موجود';
  }
  
  return error.message;
};

module.exports = {
  generateId,
  successResponse,
  errorResponse,
  formatDateTime,
  getPagination,
  buildPaginationResponse,
  sanitizeUser,
  formatOrderNumber,
  formatCartNumber,
  formatBoxNumber,
  isValidEmail,
  isValidPhone,
  extractDBError
};


