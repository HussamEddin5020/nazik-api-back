# 🔧 إصلاح خطأ SQL - Collections Table

## ❌ **المشكلة:**
```
Error: Unknown column 'c.name' in 'field list'
```

---

## 🔍 **السبب:**
الـ query كان يحاول جلب `c.name` من جدول `collections`، لكن هذا الجدول لا يحتوي على عمود `name`.

### **بنية جدول `collections`:**
```sql
CREATE TABLE `collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `collections_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
)
```

---

## ✅ **الإصلاح:**

### **قبل:**
```sql
SELECT 
  ...
  c.name as cart_name,
  cart.is_available as cart_is_available
FROM orders o
  ...
  LEFT JOIN cart ON o.cart_id = cart.id
  LEFT JOIN collections c ON o.collection_id = c.id
```

### **بعد:**
```sql
SELECT 
  ...
  cart.is_available as cart_is_available
FROM orders o
  ...
  LEFT JOIN cart ON o.cart_id = cart.id
```

---

## 📝 **التغييرات:**
1. ✅ إزالة `c.name as cart_name` من الـ SELECT
2. ✅ إزالة `LEFT JOIN collections c ON o.collection_id = c.id`
3. ✅ الاحتفاظ بـ `cart.is_available` فقط

---

## 🧪 **الاختبار:**
بعد الرفع، اختبر الـ API:

```bash
GET https://my-api-khyj.onrender.com/api/v1/under-purchase/orders
Headers: { "Authorization": "Bearer YOUR_TOKEN" }
```

**المتوقع:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

---

## 📋 **ملاحظة:**
- جدول `collections` يستخدم لتجميع الطلبات لكل عميل
- لا يحتوي على اسم (`name`) لأنه مجرد مجموعة بسيطة
- إذا احتجت لاسم السلة (`cart`), استخدم `cart.id` مع `CONCAT('CART-', cart.id)`

**الآن جاهز للرفع! 🚀**
