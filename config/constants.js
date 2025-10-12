/**
 * Application Constants
 */

module.exports = {
  // User Types
  USER_TYPES: {
    CUSTOMER: 'customer',
    USER: 'user'
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card'
  },

  // Shipment Status
  SHIPMENT_STATUS: {
    READY: 1,
    SHIPPING: 2,
    ARRIVED: 3
  },

  // Default Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Response Messages
  MESSAGES: {
    SUCCESS: 'تمت العملية بنجاح',
    ERROR: 'حدث خطأ',
    NOT_FOUND: 'غير موجود',
    UNAUTHORIZED: 'غير مصرح',
    FORBIDDEN: 'ممنوع',
    VALIDATION_ERROR: 'خطأ في البيانات المدخلة'
  }
};


