# 🔧 إعداد ملف .env

## ⚠️ ملاحظة مهمة
ملف `.env` محظور من Git لأسباب أمنية. يجب إنشاؤه يدوياً.

---

## 📝 كيفية إنشاء ملف .env

### الطريقة 1: نسخ من .env.production

```bash
# في مجلد المشروع
cd nodeJS/nzaik-api

# نسخ الملف
copy .env.production .env
```

### الطريقة 2: إنشاء يدوي

قم بإنشاء ملف جديد باسم `.env` في مجلد `nodeJS/nzaik-api/` وانسخ المحتوى التالي:

```env
# Nazik API Service Configuration

# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Aiven MySQL)
DB_HOST=your-database-host.com
DB_PORT=25931
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password-here
DB_NAME=nazikdatabase
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=nazik-refresh-token-secret-2025
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,http://localhost:8080

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## ✅ التحقق من الإعداد

بعد إنشاء ملف `.env`، قم بتشغيل:

```bash
npm run dev
```

يجب أن ترى:
```
✅ Database connected successfully
📊 Database: nazikdatabase

╔═══════════════════════════════════════════════════════════╗
║        🚀 Nazik API Server is Running                    ║
║        Port: 5000                                         ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🔐 أمان ملف .env

⚠️ **لا تشارك ملف .env أبداً!**

يحتوي على:
- كلمة مرور قاعدة البيانات
- مفاتيح JWT السرية
- معلومات حساسة أخرى

✅ الملف موجود في `.gitignore` لحمايته من الرفع لـ Git

---

## 🎯 الخطوة التالية

بعد إنشاء `.env`:
1. شغل الخادم: `npm run dev`
2. اختبر: `http://localhost:5000/health`
3. ابدأ الاختبار والتطوير! 🚀

