# 🏗️ هيكل مشروع Nazik API

## 📂 البنية الكاملة للمشروع

```
nodeJS/nzaik-api/
│
├── 📄 server.js                    # نقطة بداية التطبيق
├── 📄 package.json                 # معلومات المشروع والمكتبات
├── 📄 .env.example                 # مثال لملف البيئة
├── 📄 .gitignore                   # ملفات مستثناة من Git
├── 📄 README.md                    # دليل المشروع الرئيسي
├── 📄 INSTALLATION.md              # دليل التثبيت التفصيلي
├── 📄 QUICK_START.md               # دليل البدء السريع
└── 📄 API_DOCUMENTATION.md         # توثيق الـ API
│
├── 📁 config/                      # ملفات الإعدادات
│   ├── database.js                 # إعدادات قاعدة البيانات MySQL
│   ├── constants.js                # الثوابت العامة للتطبيق
│   └── swagger.js                  # إعدادات Swagger Documentation
│
├── 📁 constants/                   # الثوابت المتخصصة
│   ├── orderPositions.js           # حالات الطلبات
│   └── permissions.js              # الصلاحيات والإجراءات
│
├── 📁 middleware/                  # المعالجات الوسيطة
│   ├── auth.js                     # مصادقة JWT والصلاحيات
│   ├── errorHandler.js             # معالج الأخطاء المركزي
│   ├── notFound.js                 # معالج 404
│   ├── rateLimiter.js              # تحديد معدل الطلبات
│   └── validator.js                # التحقق من صحة البيانات
│
├── 📁 routes/                      # مسارات API
│   ├── auth.routes.js              # مسارات المصادقة
│   ├── user.routes.js              # مسارات المستخدمين
│   ├── customer.routes.js          # مسارات العملاء
│   ├── order.routes.js             # مسارات الطلبات
│   ├── cart.routes.js              # مسارات العربات
│   ├── box.routes.js               # مسارات الصناديق
│   ├── shipment.routes.js          # مسارات الشحنات
│   ├── invoice.routes.js           # مسارات الفواتير
│   ├── address.routes.js           # مسارات العناوين
│   ├── dashboard.routes.js         # مسارات لوحة التحكم
│   └── audit.routes.js             # مسارات سجلات التدقيق
│
├── 📁 controllers/                 # المتحكمات (Business Logic)
│   ├── auth.controller.js          # تسجيل الدخول والتسجيل
│   ├── user.controller.js          # إدارة المستخدمين
│   ├── customer.controller.js      # إدارة العملاء
│   ├── order.controller.js         # إدارة الطلبات
│   ├── cart.controller.js          # إدارة العربات
│   ├── box.controller.js           # إدارة الصناديق
│   ├── shipment.controller.js      # إدارة الشحنات
│   ├── invoice.controller.js       # إدارة الفواتير
│   ├── address.controller.js       # المدن والمناطق
│   ├── dashboard.controller.js     # لوحة التحكم
│   └── audit.controller.js         # سجلات التدقيق
│
├── 📁 models/                      # نماذج البيانات
│   ├── User.model.js               # نموذج المستخدم
│   ├── Customer.model.js           # نموذج العميل
│   └── Order.model.js              # نموذج الطلب
│
├── 📁 services/                    # خدمات العمل (Business Services)
│   ├── auth.service.js             # خدمات المصادقة
│   └── order.service.js            # خدمات الطلبات
│
├── 📁 validators/                  # التحقق من البيانات
│   ├── auth.validator.js           # التحقق من بيانات المصادقة
│   └── order.validator.js          # التحقق من بيانات الطلبات
│
└── 📁 utils/                       # أدوات مساعدة
    ├── asyncHandler.js             # معالج الدوال async
    └── helpers.js                  # دوال مساعدة عامة
```

---

## 🔄 تدفق البيانات (Data Flow)

```
Client Request
      ↓
   server.js (Express App)
      ↓
   Middleware (auth, validation, rate limiting)
      ↓
   Routes (URL mapping)
      ↓
   Controllers (Business logic)
      ↓
   Services/Models (Database operations)
      ↓
   Database (MySQL)
      ↓
   Response (JSON)
      ↓
   Client
```

---

## 🎯 المكونات الرئيسية

### 1. **server.js**
- تهيئة Express
- تحميل Middleware
- ربط المسارات
- بدء الخادم

### 2. **Routes**
- تعريف endpoints
- ربط Controllers
- تطبيق Middleware المناسب

### 3. **Controllers**
- استقبال الطلبات
- التحقق من البيانات
- استدعاء Services
- إرجاع الردود

### 4. **Services**
- منطق العمل المعقد
- عمليات قاعدة البيانات
- Transactions

### 5. **Models**
- تمثيل الكيانات
- عمليات CRUD الأساسية
- استعلامات مخصصة

### 6. **Middleware**
- المصادقة والتفويض
- التحقق من البيانات
- معالجة الأخطاء
- Rate Limiting

---

## 🔐 نظام المصادقة

```
1. User/Customer يسجل دخول
2. يتم التحقق من البيانات
3. يتم إنشاء JWT Token
4. الـ Token يُرسل للـ Client
5. Client يرسل الـ Token في كل طلب
6. Middleware يتحقق من الـ Token
7. يتم تعيين User في req.user
8. يتم تعيين Session Variables للـ Database
```

---

## 📊 قاعدة البيانات

### Session Variables المستخدمة:
- `@current_user_id` - معرف المستخدم الحالي
- `@current_user_type` - نوع المستخدم (customer/user)

### Triggers:
تقوم Triggers تلقائياً بـ:
- تسجيل جميع العمليات في `unified_audit_log`
- تحديث العدادات (cart.orders_count)
- إنشاء سجل في `order_status_history` عند تغيير الحالة

---

## 🔧 المكتبات المستخدمة

| المكتبة | الاستخدام |
|---------|-----------|
| express | إطار العمل الرئيسي |
| mysql2 | الاتصال بقاعدة البيانات |
| bcrypt | تشفير كلمات المرور |
| jsonwebtoken | المصادقة JWT |
| cors | السماح بطلبات Cross-Origin |
| helmet | حماية HTTP headers |
| morgan | تسجيل الطلبات |
| express-validator | التحقق من البيانات |
| express-rate-limit | تحديد معدل الطلبات |
| compression | ضغط الردود |
| dotenv | إدارة متغيرات البيئة |

---

## 🎨 معايير الكود

### تسمية الملفات:
- Controllers: `*.controller.js`
- Routes: `*.routes.js`
- Models: `*.model.js`
- Services: `*.service.js`
- Validators: `*.validator.js`

### تسمية الدوال:
- camelCase للدوال
- PascalCase للـ Classes
- UPPER_CASE للثوابت

### تنسيق الأكواد:
- استخدام async/await
- معالجة الأخطاء باستخدام try/catch
- استخدام asyncHandler للـ route handlers

---

Made with ❤️ by Nazik Team

