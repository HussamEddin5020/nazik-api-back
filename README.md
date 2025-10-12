# Nazik E-Commerce API

نظام إدارة الطلبات والشحن - واجهة برمجية متكاملة

## 📋 المتطلبات

- Node.js >= 16.0.0
- MySQL 8.0+
- npm >= 8.0.0

## 🚀 التثبيت

```bash
# تثبيت الحزم
npm install

# نسخ ملف البيئة
cp .env.example .env

# تحديث معلومات قاعدة البيانات في ملف .env
```

## ⚙️ الإعدادات

قم بتحديث ملف `.env` بالمعلومات التالية:

```env
# معلومات قاعدة البيانات
DB_HOST=your-database-host
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=nazikdatabase

# مفتاح JWT
JWT_SECRET=your-secret-key
```

## 🏃 التشغيل

```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm start
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register/customer` - تسجيل عميل جديد
- `POST /api/v1/auth/register/user` - تسجيل موظف جديد
- `POST /api/v1/auth/login` - تسجيل الدخول
- `POST /api/v1/auth/refresh-token` - تحديث الرمز
- `GET /api/v1/auth/me` - معلومات المستخدم الحالي

### Users
- `GET /api/v1/users` - جميع المستخدمين
- `GET /api/v1/users/:id` - مستخدم محدد
- `PUT /api/v1/users/:id` - تحديث مستخدم
- `DELETE /api/v1/users/:id` - حذف مستخدم
- `GET /api/v1/users/:id/permissions` - صلاحيات المستخدم
- `PUT /api/v1/users/:id/permissions` - تحديث الصلاحيات

### Customers
- `GET /api/v1/customers` - جميع العملاء
- `GET /api/v1/customers/:id` - عميل محدد
- `PUT /api/v1/customers/:id` - تحديث عميل
- `PUT /api/v1/customers/:id/address` - تحديث عنوان العميل
- `GET /api/v1/customers/:id/orders` - طلبات العميل

### Orders
- `GET /api/v1/orders` - جميع الطلبات
- `GET /api/v1/orders/my-orders` - طلباتي (للعميل)
- `GET /api/v1/orders/:id` - طلب محدد
- `POST /api/v1/orders` - إنشاء طلب جديد
- `PUT /api/v1/orders/:id` - تحديث طلب
- `PUT /api/v1/orders/:id/position` - تحديث حالة الطلب
- `DELETE /api/v1/orders/:id` - حذف طلب
- `GET /api/v1/orders/:id/history` - سجل تغييرات الطلب

### Carts
- `GET /api/v1/carts` - جميع العربات
- `GET /api/v1/carts/:id` - عربة محددة
- `POST /api/v1/carts` - إنشاء عربة جديدة
- `PUT /api/v1/carts/:id/availability` - تحديث توفر العربة

### Boxes
- `GET /api/v1/boxes` - جميع الصناديق
- `GET /api/v1/boxes/:id` - صندوق محدد
- `POST /api/v1/boxes` - إنشاء صندوق جديد
- `PUT /api/v1/boxes/:id` - تحديث صندوق

### Shipments
- `GET /api/v1/shipments` - جميع الشحنات
- `GET /api/v1/shipments/:id` - شحنة محددة
- `POST /api/v1/shipments` - إنشاء شحنة جديدة
- `PUT /api/v1/shipments/:id/status` - تحديث حالة الشحنة

### Invoices
- `GET /api/v1/invoices` - جميع الفواتير
- `GET /api/v1/invoices/:id` - فاتورة محددة
- `POST /api/v1/invoices` - إنشاء فاتورة جديدة
- `GET /api/v1/invoices/cart/:cartId` - فواتير العربة

### Addresses
- `GET /api/v1/addresses/cities` - جميع المدن
- `GET /api/v1/addresses/cities/:cityId/areas` - المناطق حسب المدينة
- `GET /api/v1/addresses/areas` - جميع المناطق

### Dashboard
- `GET /api/v1/dashboard/statistics` - إحصائيات لوحة التحكم
- `GET /api/v1/dashboard/recent-orders` - الطلبات الأخيرة
- `GET /api/v1/dashboard/financial-summary` - الملخص المالي

### Audit
- `GET /api/v1/audit/logs` - سجلات التدقيق
- `GET /api/v1/audit/user-activity` - نشاطات المستخدمين
- `GET /api/v1/audit/unauthorized-attempts` - محاولات الوصول غير المصرح بها

## 🔐 المصادقة

جميع الـ endpoints المحمية تتطلب رمز JWT في الـ header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📝 هيكل المشروع

```
nodeJS/nzaik-api/
├── config/
│   └── database.js          # إعدادات قاعدة البيانات
├── controllers/             # Controllers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── customer.controller.js
│   ├── order.controller.js
│   ├── cart.controller.js
│   ├── box.controller.js
│   ├── shipment.controller.js
│   ├── invoice.controller.js
│   ├── address.controller.js
│   ├── dashboard.controller.js
│   └── audit.controller.js
├── middleware/              # Middleware
│   ├── auth.js
│   ├── errorHandler.js
│   ├── notFound.js
│   ├── rateLimiter.js
│   └── validator.js
├── routes/                  # Routes
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── customer.routes.js
│   ├── order.routes.js
│   ├── cart.routes.js
│   ├── box.routes.js
│   ├── shipment.routes.js
│   ├── invoice.routes.js
│   ├── address.routes.js
│   ├── dashboard.routes.js
│   └── audit.routes.js
├── utils/                   # Utilities
│   ├── helpers.js
│   └── asyncHandler.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## 🔒 الأمان

- تشفير كلمات المرور باستخدام bcrypt
- JWT للمصادقة
- Rate limiting لمنع الهجمات
- Helmet لحماية HTTP headers
- CORS محدد
- تسجيل جميع العمليات في Audit Logs

## 📊 قاعدة البيانات

النظام يعمل مع قاعدة بيانات MySQL متقدمة تحتوي على:
- 38 جدول
- Triggers تلقائية للتتبع
- Views للتقارير
- Stored Procedures
- نظام صلاحيات متقدم

## 👥 الأدوار

- **Customer** - العملاء (يمكنهم رؤية وإدارة طلباتهم)
- **User** - الموظفين (صلاحيات حسب الدور)

## 📞 الدعم

للمساعدة أو الاستفسارات، يرجى التواصل مع فريق التطوير.

---

Made with ❤️ by Nazik Team


