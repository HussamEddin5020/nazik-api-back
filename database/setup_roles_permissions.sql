-- ========================================
-- نظام إدارة المستخدمين والصلاحيات
-- Setup Roles & Permissions System
-- Date: 2025-10-22
-- ========================================

-- ========================================
-- 1. حذف الأدوار القديمة (اختياري - احذف هذا القسم إذا كنت تريد الاحتفاظ بها)
-- ========================================
-- DELETE FROM role_permissions WHERE role_id <= 7;
-- DELETE FROM user_roles WHERE role_id <= 7;
-- DELETE FROM roles WHERE id <= 7;

-- ========================================
-- 2. إضافة الصلاحيات الجديدة
-- ========================================

-- صلاحيات المجموعات
INSERT INTO `new_permissions` (name, description, module, action, is_active) VALUES
('view_collections', 'عرض المجموعات', 'collections', 'view', 1),
('manage_collections', 'إدارة المجموعات', 'collections', 'all', 1),
('create_collections', 'إنشاء مجموعات', 'collections', 'create', 1),
('update_collections', 'تحديث المجموعات', 'collections', 'update', 1),
('delete_collections', 'حذف المجموعات', 'collections', 'delete', 1),
('send_orders_delivery', 'إرسال الطلبات للتوصيل', 'collections', 'update', 1)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  module = VALUES(module),
  action = VALUES(action);

-- صلاحيات الطلبات المستلمة
INSERT INTO `new_permissions` (name, description, module, action, is_active) VALUES
('view_received_orders', 'عرض الطلبات المستلمة', 'orders', 'view', 1)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description);

-- صلاحية إدارة الأدوار
INSERT INTO `new_permissions` (name, description, module, action, is_active) VALUES
('manage_roles', 'إدارة الأدوار', 'roles', 'all', 1),
('view_roles', 'عرض الأدوار', 'roles', 'view', 1),
('create_roles', 'إنشاء أدوار', 'roles', 'create', 1),
('update_roles', 'تحديث الأدوار', 'roles', 'update', 1),
('delete_roles', 'حذف الأدوار', 'roles', 'delete', 1)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  module = VALUES(module),
  action = VALUES(action);

-- ========================================
-- 3. إضافة الأدوار الجديدة (8 أدوار)
-- ========================================

INSERT INTO `roles` (name, description, is_active) VALUES
-- الدور 1: إدارة طلبات تحت الشراء
('إدارة طلبات تحت الشراء', 'إدارة الطلبات في مرحلة الشراء - عرض وتحديث حالة الطلبات تحت الشراء وإدارة فواتير الشراء', 1),

-- الدور 2: إدارة استلام في تركيا
('إدارة استلام في تركيا', 'استلام الطلبات وتحديث حالتها في تركيا - تحديث حالة الطلبات المستلمة في المخازن التركية', 1),

-- الدور 3: إدارة الصناديق
('إدارة الصناديق', 'إنشاء وإدارة الصناديق - إنشاء صناديق جديدة ووضع الطلبات فيها وتحديث حالتها', 1),

-- الدور 4: إدارة الشحنات
('إدارة الشحنات', 'إنشاء وإدارة الشحنات - إنشاء شحنات جديدة وإضافة الصناديق إليها وتحديث حالتها', 1),

-- الدور 5: إدارة الشحنات الواصلة
('إدارة الشحنات الواصلة', 'فتح الصناديق والتعامل مع الشحنات الواصلة - فتح الصناديق وجعل الطلبات جاهزة للتجميع', 1),

-- الدور 6: إدارة المجموعات
('إدارة المجموعات', 'إدارة المجموعات وإرسالها للتوصيل - عرض المجموعات وإرسال الطلبات للتوصيل', 1),

-- الدور 7: إدارة الطلبات المستلمة
('إدارة الطلبات المستلمة', 'عرض وإدارة الطلبات المستلمة - مراجعة الطلبات التي تم استلامها من قبل العملاء', 1),

-- الدور 8: مدير النظام الكامل
('مدير النظام الكامل', 'إدارة الحسابات والمستخدمين والتقارير والصلاحيات وسجل الأحداث - السيطرة الكاملة على النظام', 1);

-- ========================================
-- 4. الحصول على IDs للأدوار والصلاحيات
-- ========================================

-- سنحتاج إلى IDs لربطها، دعنا نستخدم المتغيرات
SET @role_under_purchase = (SELECT id FROM roles WHERE name = 'إدارة طلبات تحت الشراء' LIMIT 1);
SET @role_turkey_receiving = (SELECT id FROM roles WHERE name = 'إدارة استلام في تركيا' LIMIT 1);
SET @role_boxes = (SELECT id FROM roles WHERE name = 'إدارة الصناديق' LIMIT 1);
SET @role_shipments = (SELECT id FROM roles WHERE name = 'إدارة الشحنات' LIMIT 1);
SET @role_arrived_shipments = (SELECT id FROM roles WHERE name = 'إدارة الشحنات الواصلة' LIMIT 1);
SET @role_collections = (SELECT id FROM roles WHERE name = 'إدارة المجموعات' LIMIT 1);
SET @role_received_orders = (SELECT id FROM roles WHERE name = 'إدارة الطلبات المستلمة' LIMIT 1);
SET @role_system_admin = (SELECT id FROM roles WHERE name = 'مدير النظام الكامل' LIMIT 1);

-- ========================================
-- 5. ربط الأدوار بالصلاحيات
-- ========================================

-- ==========================================
-- الدور 1: إدارة طلبات تحت الشراء
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_under_purchase, id, 1 FROM new_permissions 
WHERE name IN (
  'view_orders',              -- عرض الطلبات
  'view_carts',               -- عرض السلات
  'update_order_status',      -- تحديث حالة الطلب
  'manage_purchase_invoices', -- إدارة فواتير الشراء
  'view_turkey_reports'       -- تقارير تركيا
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 2: إدارة استلام في تركيا
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_turkey_receiving, id, 1 FROM new_permissions 
WHERE name IN (
  'view_orders',          -- عرض الطلبات
  'update_order_status',  -- تحديث حالة الطلب (استلام)
  'view_turkey_reports',  -- تقارير الاستلام
  'view_carts'            -- عرض السلات
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 3: إدارة الصناديق
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_boxes, id, 1 FROM new_permissions 
WHERE name IN (
  'manage_boxes',        -- إدارة الصناديق (الكل)
  'view_boxes',          -- عرض الصناديق
  'create_boxes',        -- إنشاء صناديق
  'update_boxes',        -- تحديث الصناديق
  'delete_boxes',        -- حذف الصناديق
  'view_orders',         -- عرض الطلبات
  'update_order_status'  -- تحديث حالة الطلب
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 4: إدارة الشحنات
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_shipments, id, 1 FROM new_permissions 
WHERE name IN (
  'manage_shipments',       -- إدارة الشحنات (الكل)
  'view_shipments',         -- عرض الشحنات
  'create_shipments',       -- إنشاء شحنات
  'update_shipments',       -- تحديث الشحنات
  'delete_shipments',       -- حذف الشحنات
  'view_boxes',             -- عرض الصناديق
  'view_shipment_reports'   -- تقارير الشحنات
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 5: إدارة الشحنات الواصلة
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_arrived_shipments, id, 1 FROM new_permissions 
WHERE name IN (
  'view_shipments',         -- عرض الشحنات
  'view_boxes',             -- عرض الصناديق
  'update_boxes',           -- تحديث الصناديق (فتح)
  'update_order_status',    -- تحديث حالة الطلب
  'view_shipment_reports'   -- تقارير الشحنات
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 6: إدارة المجموعات
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_collections, id, 1 FROM new_permissions 
WHERE name IN (
  'view_collections',       -- عرض المجموعات
  'manage_collections',     -- إدارة المجموعات
  'send_orders_delivery',   -- إرسال للتوصيل
  'view_orders',            -- عرض الطلبات
  'update_order_status'     -- تحديث حالة الطلب
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 7: إدارة الطلبات المستلمة
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_received_orders, id, 1 FROM new_permissions 
WHERE name IN (
  'view_received_orders',   -- عرض الطلبات المستلمة
  'view_orders',            -- عرض الطلبات
  'view_reports'            -- عرض التقارير
)
ON DUPLICATE KEY UPDATE is_active = 1;

-- ==========================================
-- الدور 8: مدير النظام الكامل (جميع الصلاحيات)
-- ==========================================
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT @role_system_admin, id, 1 FROM new_permissions 
WHERE is_active = 1
ON DUPLICATE KEY UPDATE is_active = 1;

-- ========================================
-- 6. عرض النتائج
-- ========================================

SELECT '✅ تم إضافة الأدوار بنجاح' AS Status;
SELECT * FROM roles WHERE id >= @role_under_purchase;

SELECT '✅ تم إضافة الصلاحيات الجديدة' AS Status;
SELECT * FROM new_permissions WHERE module IN ('collections', 'roles');

SELECT '✅ ملخص ربط الأدوار بالصلاحيات' AS Status;
SELECT 
  r.name AS role_name,
  COUNT(rp.permission_id) AS permissions_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
WHERE r.id >= @role_under_purchase
GROUP BY r.id, r.name
ORDER BY r.id;

-- ========================================
-- النهاية
-- ========================================

