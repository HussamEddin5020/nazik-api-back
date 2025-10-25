-- إضافة الصلاحيات المفقودة إلى قاعدة البيانات
-- هذا السكريبت يضيف الصلاحيات التي تم استخدامها في APIs ولكنها غير موجودة في قاعدة البيانات

-- 1. إضافة صلاحيات إنشاء الصناديق (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('create_boxes', 'إنشاء صناديق', 'boxes', 'create', 1, NOW(), NOW());

-- 2. إضافة صلاحيات تحديث الصناديق (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('update_boxes', 'تحديث الصناديق', 'boxes', 'update', 1, NOW(), NOW());

-- 3. إضافة صلاحيات إنشاء السلات (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('create_carts', 'إنشاء سلات', 'carts', 'create', 1, NOW(), NOW());

-- 4. إضافة صلاحيات إنشاء الشحنات (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('create_shipments', 'إنشاء شحنات', 'shipments', 'create', 1, NOW(), NOW());

-- 5. إضافة صلاحيات تحديث الشحنات (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('update_shipments', 'تحديث الشحنات', 'shipments', 'update', 1, NOW(), NOW());

-- 6. إضافة صلاحيات إدارة الطلبات المستلمة (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('view_received_orders', 'عرض الطلبات المستلمة', 'orders', 'view', 1, NOW(), NOW());

-- 7. إضافة صلاحيات إرسال الطلبات للتوصيل (إذا لم تكن موجودة)
INSERT IGNORE INTO `new_permissions` (name, description, module, action, is_active, created_at, updated_at)
VALUES ('send_orders_delivery', 'إرسال الطلبات للتوصيل', 'collections', 'update', 1, NOW(), NOW());

-- التحقق من الصلاحيات المضافة
SELECT 
    id,
    name,
    description,
    module,
    action
FROM new_permissions
WHERE name IN (
    'create_boxes',
    'update_boxes',
    'create_carts',
    'create_shipments',
    'update_shipments',
    'view_received_orders',
    'send_orders_delivery'
)
ORDER BY module, name;





