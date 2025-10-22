/**
 * Permission Constants - النظام الجديد
 * These match the new_permissions table in the database
 */

const NEW_PERMISSIONS = {
  // إدارة المستخدمين
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  UPDATE_USERS: 'update_users',
  DELETE_USERS: 'delete_users',

  // إدارة الطلبات
  MANAGE_ORDERS: 'manage_orders',
  VIEW_ORDERS: 'view_orders',
  CREATE_ORDERS: 'create_orders',
  UPDATE_ORDERS: 'update_orders',
  DELETE_ORDERS: 'delete_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',

  // إدارة السلات
  MANAGE_CARTS: 'manage_carts',
  VIEW_CARTS: 'view_carts',
  CREATE_CARTS: 'create_carts',
  UPDATE_CARTS: 'update_carts',
  DELETE_CARTS: 'delete_carts',

  // إدارة الصناديق
  MANAGE_BOXES: 'manage_boxes',
  VIEW_BOXES: 'view_boxes',
  CREATE_BOXES: 'create_boxes',
  UPDATE_BOXES: 'update_boxes',
  DELETE_BOXES: 'delete_boxes',

  // إدارة الشحنات
  MANAGE_SHIPMENTS: 'manage_shipments',
  VIEW_SHIPMENTS: 'view_shipments',
  CREATE_SHIPMENTS: 'create_shipments',
  UPDATE_SHIPMENTS: 'update_shipments',
  DELETE_SHIPMENTS: 'delete_shipments',

  // إدارة المالية
  MANAGE_FINANCE: 'manage_finance',
  VIEW_FINANCE: 'view_finance',
  MANAGE_INVOICES: 'manage_invoices',
  MANAGE_PAYMENTS: 'manage_payments',

  // التقارير
  VIEW_REPORTS: 'view_reports',
  VIEW_TURKEY_REPORTS: 'view_turkey_reports',
  VIEW_SHIPMENT_REPORTS: 'view_shipment_reports',
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',

  // سجلات التدقيق
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // إدارة الصلاحيات
  MANAGE_PERMISSIONS: 'manage_permissions',
  VIEW_PERMISSIONS: 'view_permissions',

  // إدارة الأدوار
  MANAGE_ROLES: 'manage_roles',
  VIEW_ROLES: 'view_roles',
  CREATE_ROLES: 'create_roles',
  UPDATE_ROLES: 'update_roles',
  DELETE_ROLES: 'delete_roles',

  // إدارة المجموعات
  VIEW_COLLECTIONS: 'view_collections',
  MANAGE_COLLECTIONS: 'manage_collections',
  CREATE_COLLECTIONS: 'create_collections',
  UPDATE_COLLECTIONS: 'update_collections',
  DELETE_COLLECTIONS: 'delete_collections',
  SEND_ORDERS_DELIVERY: 'send_orders_delivery',

  // الطلبات المستلمة
  VIEW_RECEIVED_ORDERS: 'view_received_orders',

  // فواتير الشراء
  MANAGE_PURCHASE_INVOICES: 'manage_purchase_invoices',
  CANCEL_ORDERS: 'cancel_orders'
};

const PERMISSION_MODULES = {
  USERS: 'users',
  ORDERS: 'orders',
  CARTS: 'carts',
  BOXES: 'boxes',
  SHIPMENTS: 'shipments',
  FINANCE: 'finance',
  REPORTS: 'reports',
  AUDIT: 'audit',
  PERMISSIONS: 'permissions',
  ROLES: 'roles',
  COLLECTIONS: 'collections'
};

const PERMISSION_ACTIONS = {
  ALL: 'all',
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

const ROLES = {
  SYSTEM_ADMIN: 'مدير النظام',
  ORDERS_MANAGER: 'مدير الطلبات',
  TURKEY_RECEIVING: 'موظف استلام تركيا',
  SHIPMENTS_STAFF: 'موظف الشحنات',
  REPORTS_STAFF: 'موظف التقارير',
  GENERAL_SUPERVISOR: 'مشرف عام',
  FINANCE_STAFF: 'موظف المالية'
};

// النظام القديم (للتوافق مع الإصدارات السابقة)
const PERMISSIONS = {
  VIEW: 4004000001,
  ADD: 4004000002,
  UPDATE: 4004000003,
  DELETE: 4004000004,
  CONFIRM_DEPOSIT: 4004000005,
  MANAGE_FX: 4004000006,
  VIEW_AUDIT_LOGS: 4004000007
};

const PERMISSION_NAMES = {
  4004000001: 'view',
  4004000002: 'add',
  4004000003: 'update',
  4004000004: 'delete',
  4004000005: 'confirm_deposit',
  4004000006: 'manage_fx',
  4004000007: 'view_audit_logs'
};

const ACTIONS = {
  NEW: 1,
  UNDER_PURCHASE: 2,
  PURCHASED: 3,
  RECEIVED_IN_TURKEY: 4,
  BOXED: 5,
  SHIPPED: 6,
  ARRIVED_IN_LIBYA: 7,
  PREPARING: 8,
  READY_FOR_DELIVERY: 9,
  OUT_FOR_DELIVERY: 10,
  DELIVERED: 11,
  CANCELLED: 12,
  RETURN_PENDING: 13,
  RETURNED_TO_TURKEY: 14,
  RETURNED: 15,
  PARTIAL: 16
};

module.exports = {
  // النظام الجديد
  NEW_PERMISSIONS,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  ROLES,
  
  // النظام القديم (للتوافق)
  PERMISSIONS,
  PERMISSION_NAMES,
  ACTIONS
};


