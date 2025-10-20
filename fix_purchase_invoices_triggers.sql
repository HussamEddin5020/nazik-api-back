-- ============================================
-- إصلاح Triggers جدول purchase_invoices
-- المشكلة: استخدام أسماء أعمدة قديمة في unified_audit_log
-- ============================================

-- 1️⃣ حذف الـ Triggers القديمة
DROP TRIGGER IF EXISTS trg_purchase_invoices_after_insert;
DROP TRIGGER IF EXISTS trg_purchase_invoices_after_update;
DROP TRIGGER IF EXISTS trg_purchase_invoices_after_delete;

-- 2️⃣ إنشاء Trigger جديد للـ INSERT
DELIMITER $$

CREATE TRIGGER trg_purchase_invoices_after_insert
AFTER INSERT ON purchase_invoices
FOR EACH ROW
BEGIN
    INSERT INTO unified_audit_log (
        actor_user_id, 
        actor_type,
        table_name,           -- ✅ تم التصحيح من entity_type
        record_id,            -- ✅ تم التصحيح من entity_id
        action_type,
        new_values, 
        description,
        permission_id, 
        has_permission,       -- ✅ تم التصحيح من requires_permission
        created_at
    ) VALUES (
        @current_user_id,
        IF(@current_user_id IS NULL, 'system', 'user'),
        'purchase_invoices',
        NEW.id,
        'INSERT',
        JSON_OBJECT(
            'cart_id', NEW.cart_id,
            'total', NEW.total,
            'has_invoice_image', IF(LENGTH(NEW.invoice_image_base64) > 0, 'نعم', 'لا')
        ),
        CONCAT('تم إنشاء فاتورة شراء جديدة - رقم: ', NEW.id),
        1,
        1,
        NOW()
    );
END$$

DELIMITER ;

-- 3️⃣ إنشاء Trigger جديد للـ UPDATE
DELIMITER $$

CREATE TRIGGER trg_purchase_invoices_after_update
AFTER UPDATE ON purchase_invoices
FOR EACH ROW
BEGIN
    DECLARE changed_fields JSON DEFAULT JSON_ARRAY();
    
    -- تتبع التغييرات
    IF OLD.cart_id != NEW.cart_id OR (OLD.cart_id IS NULL AND NEW.cart_id IS NOT NULL) OR (OLD.cart_id IS NOT NULL AND NEW.cart_id IS NULL) THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'cart_id');
    END IF;
    
    IF OLD.total != NEW.total THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'total');
    END IF;
    
    IF OLD.invoice_image_base64 != NEW.invoice_image_base64 THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'invoice_image_base64');
    END IF;
    
    -- تسجيل التغييرات إذا حدثت
    IF JSON_LENGTH(changed_fields) > 0 THEN
        INSERT INTO unified_audit_log (
            actor_user_id, 
            actor_type,
            table_name,           -- ✅ تم التصحيح من entity_type
            record_id,            -- ✅ تم التصحيح من entity_id
            action_type,
            old_values, 
            new_values, 
            changed_fields,
            description,
            permission_id, 
            has_permission,       -- ✅ تم التصحيح من requires_permission
            created_at
        ) VALUES (
            @current_user_id,
            IF(@current_user_id IS NULL, 'system', 'user'),
            'purchase_invoices',
            NEW.id,
            'UPDATE',
            JSON_OBJECT(
                'cart_id', OLD.cart_id,
                'total', OLD.total,
                'has_invoice_image', IF(LENGTH(OLD.invoice_image_base64) > 0, 'نعم', 'لا')
            ),
            JSON_OBJECT(
                'cart_id', NEW.cart_id,
                'total', NEW.total,
                'has_invoice_image', IF(LENGTH(NEW.invoice_image_base64) > 0, 'نعم', 'لا')
            ),
            changed_fields,
            CONCAT('تم تحديث فاتورة الشراء - رقم: ', NEW.id),
            1,
            1,
            NOW()
        );
    END IF;
END$$

DELIMITER ;

-- 4️⃣ إنشاء Trigger جديد للـ DELETE
DELIMITER $$

CREATE TRIGGER trg_purchase_invoices_after_delete
AFTER DELETE ON purchase_invoices
FOR EACH ROW
BEGIN
    INSERT INTO unified_audit_log (
        actor_user_id, 
        actor_type,
        table_name,           -- ✅ تم التصحيح من entity_type
        record_id,            -- ✅ تم التصحيح من entity_id
        action_type,
        old_values, 
        description,
        permission_id, 
        has_permission,       -- ✅ تم التصحيح من requires_permission
        created_at
    ) VALUES (
        @current_user_id,
        IF(@current_user_id IS NULL, 'system', 'user'),
        'purchase_invoices',
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'cart_id', OLD.cart_id,
            'total', OLD.total,
            'has_invoice_image', IF(LENGTH(OLD.invoice_image_base64) > 0, 'نعم', 'لا')
        ),
        CONCAT('تم حذف فاتورة الشراء - رقم: ', OLD.id),
        1,
        1,
        NOW()
    );
END$$

DELIMITER ;

-- ✅ تم إصلاح جميع الـ Triggers بنجاح
SELECT '✅ تم إصلاح Triggers جدول purchase_invoices بنجاح' AS status;

