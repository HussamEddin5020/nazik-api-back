# 🚀 قائمة التحقق قبل الرفع على Render

## ✅ **الملفات المطلوبة:**

### **Controllers:**
- ✅ `controllers/underPurchase.controller.js` - تم إصلاح import
- ✅ `controllers/auth.controller.js`
- ✅ `controllers/dashboard.controller.js`

### **Routes:**
- ✅ `routes/underPurchase.routes.js`
- ✅ `routes/test.routes.js`
- ✅ `routes/auth.routes.js`
- ✅ `routes/dashboard.routes.js`

### **Middleware:**
- ✅ `middleware/auth.js`
- ✅ `middleware/permissionMiddleware.js` - تم إصلاح import
- ✅ `middleware/asyncHandler.js`

### **Utils:**
- ✅ `utils/helpers.js` - يحتوي على responseHelper functions
- ✅ `utils/asyncHandler.js`

### **Config:**
- ✅ `config/database.js`
- ✅ `server.js` - تم إضافة routes

---

## 🔧 **الإصلاحات المنفذة:**

### **1. إصلاح Imports:**
```javascript
// قبل:
const { successResponse, errorResponse, buildPaginationResponse } = require('../utils/responseHelper');

// بعد:
const { successResponse, errorResponse, buildPaginationResponse } = require('../utils/helpers');
```

### **2. إضافة Test Routes:**
```javascript
// في server.js
const testRoutes = require('./routes/test.routes');
app.use('/api/v1/test', testRoutes);
```

### **3. إضافة Debug Logging:**
```javascript
// في underPurchase.controller.js
console.log('🔍 Under Purchase API called:', { user, query, timestamp });
```

---

## 📡 **APIs الجديدة:**

### **Under Purchase APIs:**
1. `GET /api/v1/under-purchase/orders` - جلب الطلبات
2. `GET /api/v1/under-purchase/orders/:id` - تفاصيل الطلب
3. `GET /api/v1/under-purchase/carts` - جلب السلات
4. `GET /api/v1/under-purchase/brands` - جلب البراندات
5. `POST /api/v1/under-purchase/orders/:id/add-to-cart` - إضافة إلى سلة
6. `DELETE /api/v1/under-purchase/orders/:id/remove-from-cart` - إزالة من سلة

### **Test APIs:**
1. `GET /api/v1/test/test` - اختبار بدون auth
2. `GET /api/v1/test/test-auth` - اختبار مع auth

---

## 🚀 **خطوات الرفع:**

### **1. التحقق من الملفات:**
```bash
# تأكد من أن جميع الملفات موجودة
ls -la controllers/underPurchase.controller.js
ls -la routes/underPurchase.routes.js
ls -la middleware/permissionMiddleware.js
ls -la utils/helpers.js
```

### **2. رفع التغييرات:**
```bash
git add .
git commit -m "Fix imports and add under-purchase endpoints"
git push origin main
```

### **3. مراقبة الـ Logs في Render:**
- انتظر حتى يكتمل الـ deployment
- راقب الـ logs للتحقق من عدم وجود أخطاء
- يجب أن ترى: "Nazik API Server is Running"

---

## 🧪 **اختبار بعد الرفع:**

### **1. Health Check:**
```bash
GET https://my-api-khyj.onrender.com/health
```

### **2. Test Endpoint:**
```bash
GET https://my-api-khyj.onrender.com/api/v1/test/test
```

### **3. Auth Test:**
```bash
GET https://my-api-khyj.onrender.com/api/v1/test/test-auth
Headers: { "Authorization": "Bearer YOUR_TOKEN" }
```

### **4. Under Purchase API:**
```bash
GET https://my-api-khyj.onrender.com/api/v1/under-purchase/orders
Headers: { "Authorization": "Bearer YOUR_TOKEN" }
```

---

## ⚠️ **ملاحظات مهمة:**

1. **تأكد من وجود بيانات** في جدول `orders` مع `position_id = 2`
2. **تأكد من صحة JWT Token** في الاختبارات
3. **راقب الـ console logs** في Render للتحقق من debug messages

**الآن جاهز للرفع! 🚀**
