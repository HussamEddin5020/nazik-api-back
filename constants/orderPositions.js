/**
 * Order Position Constants
 * These match the order_position table in the database
 */

const ORDER_POSITIONS = {
  NEW: 1,                           // جديد
  UNDER_PURCHASE: 2,                // تحت الشراء
  RECEIVED_IN_TURKEY: 3,            // الاستلام في مخازن تركيا
  BEING_SHIPPED: 4,                 // جاري الشحن
  ARRIVED_IN_LIBYA: 5,              // وصلت الى ليبيا
  SHIPPED: 6,                       // تم الشحن
  ARRIVED_TO_LIBYA: 7,              // وصل إلى ليبيا
  PREPARING: 8,                     // قيد التحضير
  READY_FOR_DELIVERY: 9,            // جاهز للتسليم
  OUT_FOR_DELIVERY: 10,             // قيد التوصيل
  DELIVERED: 11,                    // تم التسليم
  CANCELLED: 12,                    // ملغي
  RETURN_PENDING: 13,               // قيد الإرجاع
  RETURNED_TO_TURKEY: 14,           // تمت إعادته إلى تركيا
  RETURNED: 15,                     // مُرجع
  PARTIAL: 16                       // جزئي
};

const ORDER_POSITION_NAMES = {
  1: 'جديد',
  2: 'تحت الشراء',
  3: 'الاستلام في مخازن تركيا',
  4: 'جاري الشحن',
  5: 'وصلت الى ليبيا',
  6: 'تم الشحن',
  7: 'وصل إلى ليبيا',
  8: 'قيد التحضير',
  9: 'عاد الطلب للشركة',
  10: 'جاري الشحن لتركيا',
  11: 'عادت لمخزن تركيا',
  12: 'تم ارجاع الطلب وارجاع القيمة المالية',
  13: 'جاهز للتسليم',
  14: 'قيد التوصيل',
  15: 'تم التسليم',
  16: 'ملغي'
};

module.exports = {
  ORDER_POSITIONS,
  ORDER_POSITION_NAMES
};


