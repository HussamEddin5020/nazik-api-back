-- =====================================================
-- منح كافة الصلاحيات للمستخدم 1001000039
-- =====================================================

USE nazikdatabase;

-- =====================================================
-- 1. التحقق من وجود المستخدم
-- =====================================================
SELECT 'التحقق من وجود المستخدم:' as step;
SELECT 
    id,
    name,
    email,
    type,
    status,
    created_at
FROM users 
WHERE id = 1001000039;

-- =====================================================
-- 2. التحقق من الأدوار الموجودة
-- =====================================================
SELECT 'الأدوار الموجودة:' as step;
SELECT * FROM roles ORDER BY id;

-- =====================================================
-- 3. منح دور "مدير النظام" للمستخدم
-- =====================================================
SELECT 'منح دور مدير النظام للمستخدم:' as step;

-- إزالة أي أدوار سابقة للمستخدم
DELETE FROM user_roles WHERE user_id = 1001000039;

-- منح دور "مدير النظام" (id = 1)
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
VALUES (1001000039, 1, 1001000039, NOW(), TRUE);

-- =====================================================
-- 4. التحقق من الصلاحيات الممنوحة
-- =====================================================
SELECT 'الصلاحيات الممنوحة للمستخدم:' as step;
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.name as role_name,
    r.description as role_description,
    COUNT(rp.permission_id) as permissions_count,
    ur.assigned_at,
    ur.is_active
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = TRUE
WHERE u.id = 1001000039
GROUP BY u.id, u.name, u.email, r.name, r.description, ur.assigned_at, ur.is_active;

-- =====================================================
-- 5. عرض جميع الصلاحيات الممنوحة
-- =====================================================
SELECT 'جميع الصلاحيات الممنوحة:' as step;
SELECT 
    np.name as permission_name,
    np.description as permission_description,
    np.module,
    np.action
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = TRUE
JOIN new_permissions np ON rp.permission_id = np.id AND np.is_active = TRUE
WHERE u.id = 1001000039
ORDER BY np.module, np.action;

-- =====================================================
-- 6. اختبار الصلاحيات باستخدام Function
-- =====================================================
SELECT 'اختبار الصلاحيات:' as step;
SELECT 
    'view_orders' as permission,
    fn_check_user_permission_new(1001000039, 'view_orders') as has_permission
UNION ALL
SELECT 
    'manage_users' as permission,
    fn_check_user_permission_new(1001000039, 'manage_users') as has_permission
UNION ALL
SELECT 
    'view_audit_logs' as permission,
    fn_check_user_permission_new(1001000039, 'view_audit_logs') as has_permission
UNION ALL
SELECT 
    'manage_permissions' as permission,
    fn_check_user_permission_new(1001000039, 'manage_permissions') as has_permission;

-- =====================================================
-- 7. عرض View المستخدمين مع أدوارهم
-- =====================================================
SELECT 'عرض المستخدم مع أدواره:' as step;
SELECT * FROM v_user_roles WHERE user_id = 1001000039;

-- =====================================================
-- 8. عرض View الصلاحيات الفعالة
-- =====================================================
SELECT 'الصلاحيات الفعالة للمستخدم:' as step;
SELECT * FROM v_user_permissions WHERE user_id = 1001000039;

COMMIT;

SELECT 'تم منح كافة الصلاحيات للمستخدم 1001000039 بنجاح!' as final_message;






