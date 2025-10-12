# 🎯 ابدأ من هنا - Nazik API

## ✅ ما تم إنجازه

تم إنشاء **مشروع Node.js API متكامل** يحتوي على:

### 📦 الملفات الأساسية (40+ ملف):
- ✅ Server configuration
- ✅ Database connection
- ✅ Authentication system (JWT)
- ✅ Authorization & Permissions
- ✅ 11 Routes modules
- ✅ 11 Controllers
- ✅ 3 Models
- ✅ 2 Services
- ✅ 5 Middleware
- ✅ 2 Validators
- ✅ Helper utilities
- ✅ Complete documentation

---

## 🚀 للبدء الآن

### الخطوة 1: تثبيت المكتبات
```bash
cd nodeJS/nzaik-api
npm install
```

### الخطوة 2: إعداد ملف .env
```bash
# نسخ ملف المثال
copy .env.example .env

# ثم افتح .env وحدث معلومات قاعدة البيانات:
# DB_HOST=your-host
# DB_USER=avnadmin
# DB_PASSWORD=your-password
# DB_NAME=nazikdatabase
```

### الخطوة 3: تشغيل المشروع
```bash
npm run dev
```

### الخطوة 4: اختبار الاتصال
افتح المتصفح على:
```
http://localhost:3000/health
```

---

## 📖 الأدلة المتوفرة

| الملف | الوصف |
|-------|--------|
| `README.md` | نظرة عامة على المشروع |
| `QUICK_START.md` | دليل البدء السريع (3 خطوات) |
| `INSTALLATION.md` | دليل التثبيت التفصيلي |
| `API_DOCUMENTATION.md` | توثيق كامل لجميع Endpoints |
| `PROJECT_STRUCTURE.md` | شرح هيكل المشروع |

---

## 🎯 الـ Endpoints الجاهزة

### 🔐 المصادقة:
- `POST /api/v1/auth/register/customer` - تسجيل عميل
- `POST /api/v1/auth/register/user` - تسجيل موظف
- `POST /api/v1/auth/login` - تسجيل دخول
- `GET /api/v1/auth/me` - معلوماتي

### 📦 الطلبات:
- `GET /api/v1/orders` - جميع الطلبات
- `GET /api/v1/orders/my-orders` - طلباتي
- `POST /api/v1/orders` - إنشاء طلب
- `PUT /api/v1/orders/:id` - تحديث طلب
- `PUT /api/v1/orders/:id/position` - تحديث حالة الطلب

### 👥 العملاء:
- `GET /api/v1/customers` - جميع العملاء
- `GET /api/v1/customers/:id` - عميل محدد
- `PUT /api/v1/customers/:id` - تحديث عميل

### 🚚 الشحن:
- `GET /api/v1/carts` - العربات
- `GET /api/v1/boxes` - الصناديق
- `GET /api/v1/shipments` - الشحنات

### 📊 لوحة التحكم:
- `GET /api/v1/dashboard/statistics` - الإحصائيات
- `GET /api/v1/dashboard/recent-orders` - الطلبات الأخيرة

### 📍 العناوين:
- `GET /api/v1/addresses/cities` - المدن
- `GET /api/v1/addresses/cities/:id/areas` - المناطق

---

## 🔑 المميزات الرئيسية

### 1. **نظام مصادقة متقدم**
- ✅ JWT Tokens
- ✅ Refresh Tokens
- ✅ Password hashing with bcrypt
- ✅ Session variables للـ Database

### 2. **نظام صلاحيات شامل**
- ✅ Role-based access (Customer/User)
- ✅ Permission-based authorization
- ✅ Action-level permissions
- ✅ Middleware للتحقق من الصلاحيات

### 3. **تتبع كامل للعمليات**
- ✅ Audit logs تلقائية
- ✅ تسجيل محاولات الدخول
- ✅ تتبع تغييرات حالات الطلبات
- ✅ Session variables للـ Triggers

### 4. **أمان متقدم**
- ✅ Helmet للحماية
- ✅ CORS محدد
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection prevention

### 5. **معالجة أخطاء محترفة**
- ✅ Error handler مركزي
- ✅ Async error handling
- ✅ Database error formatting
- ✅ Validation errors

---

## 📝 اختبار سريع

### تسجيل عميل جديد:
```javascript
// POST /api/v1/auth/register/customer
{
  "name": "محمد أحمد",
  "phone": "0912345678",
  "password": "123456",
  "city_id": 1,
  "area_id": 1,
  "street": "شارع النصر"
}
```

### تسجيل دخول:
```javascript
// POST /api/v1/auth/login
{
  "identifier": "0912345678",
  "password": "123456"
}
```

### إنشاء طلب:
```javascript
// POST /api/v1/orders
// Headers: Authorization: Bearer TOKEN
{
  "customer_id": 2002000001,
  "details": {
    "title": "هاتف سامسونج",
    "color": "أسود",
    "size": "128GB",
    "prepaid_value": 100,
    "original_product_price": 700,
    "commission": 50,
    "total": 850
  }
}
```

---

## 🎨 البنية المعمارية

```
┌─────────────────┐
│   Flutter App   │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   Express API   │
│   (Node.js)     │
└────────┬────────┘
         │ MySQL2
         ↓
┌─────────────────┐
│  MySQL Database │
│  (nazikdatabase)│
└─────────────────┘
```

---

## 🔄 الخطوات التالية

1. ✅ **تم**: إنشاء مشروع Node.js API كامل
2. 🔜 **القادم**: تطبيق Flutter
3. 🔜 **القادم**: اختبار التكامل بين Flutter والـ API

---

## 💡 نصائح مهمة

### للتطوير:
- استخدم `npm run dev` للتشغيل مع auto-reload
- راجع console للأخطاء
- استخدم Postman لاختبار الـ API

### للإنتاج:
- غير جميع المفاتيح السرية في `.env`
- فعّل HTTPS
- راجع إعدادات CORS
- زد من أمان Rate Limiting

### للأداء:
- استخدم Connection Pool (موجود مسبقاً)
- فعّل Compression (موجود مسبقاً)
- راجع indexes في قاعدة البيانات

---

## 📞 الدعم الفني

في حال واجهت مشكلة:
1. راجع ملف `INSTALLATION.md`
2. تحقق من السجلات في console
3. تأكد من إعدادات `.env`
4. راجع توثيق الـ API في `API_DOCUMENTATION.md`

---

## 🎉 مبروك!

مشروع الـ API جاهز بالكامل ويمكنك:
- ✅ البدء في الاختبار
- ✅ تطوير تطبيق Flutter
- ✅ التوسع وإضافة features جديدة

**التالي:** تطبيق Flutter 📱

---

Made with ❤️ by Nazik Team

