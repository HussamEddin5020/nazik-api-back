-- =====================================================
-- إزالة نظام الصلاحيات القديم بالكامل
-- =====================================================

USE nazikdatabase;

-- =====================================================
-- 1. حذف Triggers القديمة
-- =====================================================

DROP TRIGGER IF EXISTS audit_logs;
DROP TRIGGER IF EXISTS audit_logs_after_insert;
DROP TRIGGER IF EXISTS audit_logs_after_update;
DROP TRIGGER IF EXISTS audit_logs_after_delete;

-- =====================================================
-- 2. حذف Functions القديمة
-- =====================================================

DROP FUNCTION IF EXISTS fn_check_user_permission;

-- =====================================================
-- 3. حذف Stored Procedures القديمة
-- =====================================================

DROP PROCEDURE IF EXISTS sp_log_audit_with_permission;

-- =====================================================
-- 4. حذف الجداول القديمة (بترتيب صحيح بسبب Foreign Keys)
-- =====================================================

-- حذف جدول user_permissions أولاً (لأنه يحتوي على Foreign Keys)
DROP TABLE IF EXISTS user_permissions;

-- حذف جدول table_permission_mapping (لأنه يحتوي على Foreign Key لـ permissions)
DROP TABLE IF EXISTS table_permission_mapping;

-- حذف جدول permissions
DROP TABLE IF EXISTS permissions;

-- حذف جدول actions
DROP TABLE IF EXISTS actions;

-- =====================================================
-- 5. تنظيف البيانات المكررة في النظام الجديد
-- =====================================================

-- تعطيل Safe Update Mode مؤقتاً
SET SQL_SAFE_UPDATES = 0;

-- حذف الصلاحيات المترحلة من النظام القديم
DELETE FROM new_permissions 
WHERE description COLLATE utf8mb4_unicode_ci LIKE '%ترحيل من النظام القديم%';

-- إعادة تفعيل Safe Update Mode
SET SQL_SAFE_UPDATES = 1;

-- =====================================================
-- 6. اختبار النظام الجديد
-- =====================================================

-- اختبار Function الجديدة
SELECT 'اختبار Function الجديدة:' as test_section;
SELECT 
    fn_check_user_permission_new(1001000039, 'view_orders') as has_view_orders,
    fn_check_user_permission_new(1001000039, 'manage_users') as has_manage_users,
    fn_check_user_permission_new(1001000039, 'view_audit_logs') as has_audit_logs;

-- عرض الأدوار الموجودة
SELECT 'الأدوار الموجودة:' as test_section;
SELECT * FROM roles ORDER BY id;

-- عرض الصلاحيات الموجودة
SELECT 'الصلاحيات الموجودة:' as test_section;
SELECT * FROM new_permissions ORDER BY module, action;

-- عرض المستخدمين مع أدوارهم
SELECT 'المستخدمين مع أدوارهم:' as test_section;
SELECT 
    u.id,
    u.name,
    u.type,
    r.name as role_name,
    ur.is_active
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.type COLLATE utf8mb4_unicode_ci = 'user'
ORDER BY u.id;

COMMIT;

SELECT 'تم إزالة النظام القديم بنجاح!' as final_message;

