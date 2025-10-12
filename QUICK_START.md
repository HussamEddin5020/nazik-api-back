# ⚡ دليل البدء السريع - Nazik API

## 🚀 التشغيل في 3 خطوات

### الخطوة 1: التثبيت
```bash
cd nodeJS/nzaik-api
npm install
```

### الخطوة 2: إعداد البيئة
قم بنسخ `.env.example` إلى `.env` وحدث معلومات قاعدة البيانات:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

### الخطوة 3: التشغيل
```bash
npm run dev
```

---

## 🧪 اختبار سريع

### 1. افتح المتصفح على:
```
http://localhost:3000/health
```

يجب أن ترى:
```json
{
  "status": "success",
  "message": "Nazik API is running"
}
```

### 2. تسجيل دخول بمستخدم تجريبي:

**للعميل:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"0910504021\",\"password\":\"123456\"}"
```

**للموظف (بصلاحيات كاملة):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"0922334455\",\"password\":\"admin123\"}"
```

### 3. الحصول على المدن:
```bash
curl http://localhost:3000/api/v1/addresses/cities
```

---

## 📋 Endpoints الأساسية

| Method | Endpoint | الوصف | مصادقة |
|--------|----------|--------|---------|
| POST | `/api/v1/auth/register/customer` | تسجيل عميل | ❌ |
| POST | `/api/v1/auth/login` | تسجيل دخول | ❌ |
| GET | `/api/v1/orders/my-orders` | طلباتي | ✅ |
| POST | `/api/v1/orders` | إنشاء طلب | ✅ |
| GET | `/api/v1/addresses/cities` | المدن | ❌ |
| GET | `/api/v1/dashboard/statistics` | الإحصائيات | ✅ Staff |

---

## 🔑 استخدام الـ Token

بعد تسجيل الدخول، استخدم الـ token في كل طلب:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     http://localhost:3000/api/v1/orders/my-orders
```

---

## 📁 هيكل المشروع البسيط

```
nzaik-api/
├── server.js              # نقطة البداية
├── config/
│   └── database.js        # الاتصال بقاعدة البيانات
├── routes/                # المسارات
├── controllers/           # منطق العمل
├── middleware/            # المعالجات الوسيطة
└── .env                   # الإعدادات
```

---

## ⚠️ مشاكل شائعة وحلولها

### المشكلة: `Cannot find module 'express'`
**الحل:**
```bash
npm install
```

### المشكلة: `Database connection failed`
**الحل:**
- تأكد من تشغيل MySQL
- راجع معلومات الاتصال في `.env`

### المشكلة: `Port 3000 is already in use`
**الحل:**
غير PORT في `.env`:
```env
PORT=3001
```

---

## 📞 المساعدة

**سجلات الخادم:**
ستظهر جميع الأخطاء في console

**اختبار الاتصال بقاعدة البيانات:**
عند تشغيل الخادم، يجب أن ترى:
```
✅ Database connected successfully
📊 Database: nazikdatabase
```

---

**جاهز للعمل!** 🎉


