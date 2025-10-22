-- منح كافة الصلاحيات للمستخدم 1001000039
USE nazikdatabase;

-- إزالة أي أدوار سابقة
DELETE FROM user_roles WHERE user_id = 1001000039;

-- منح دور "مدير النظام" (id = 1)
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
VALUES (1001000039, 1, 1001000039, NOW(), TRUE);

-- التحقق من النتيجة
SELECT 
    u.id as user_id,
    u.name as user_name,
    r.name as role_name,
    COUNT(rp.permission_id) as permissions_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = TRUE
WHERE u.id = 1001000039
GROUP BY u.id, u.name, r.name;


