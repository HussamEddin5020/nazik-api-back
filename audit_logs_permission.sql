-- إضافة صلاحية عرض سجلات الأحداث
INSERT INTO permissions (id, name, description) 
VALUES (4004000007, 'manage_audit', 'Can view and manage audit logs');

-- إضافة الصلاحية للمديرين
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT 
    u.id,
    4004000007,
    1001000039 -- ID المدير الرئيسي
FROM users u 
WHERE u.type = 'user' 
AND u.id NOT IN (
    SELECT user_id 
    FROM user_permissions 
    WHERE permission_id = 4004000007
);


