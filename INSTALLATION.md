# 📦 دليل التثبيت والتشغيل - Nazik API

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- ✅ Node.js (الإصدار 16 أو أحدث)
- ✅ npm (الإصدار 8 أو أحدث)
- ✅ MySQL 8.0 أو أحدث
- ✅ قاعدة البيانات `nazikdatabase` محملة ومفعلة

## خطوات التثبيت

### 1️⃣ تثبيت المكتبات

```bash
cd nodeJS/nzaik-api
npm install
```

### 2️⃣ إعداد ملف البيئة

قم بنسخ ملف `.env.example` إلى `.env`:

```bash
cp .env.example .env
```

ثم قم بتحديث المعلومات في ملف `.env`:

```env
# معلومات الخادم
PORT=3000
NODE_ENV=development

# معلومات قاعدة البيانات
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-actual-password
DB_NAME=nazikdatabase

# مفتاح JWT (غيره في الإنتاج!)
JWT_SECRET=your-super-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-token-secret
```

### 3️⃣ التأكد من قاعدة البيانات

تأكد من:
- ✅ قاعدة البيانات `nazikdatabase` موجودة
- ✅ جميع الجداول محملة من ملف `full-database.sql`
- ✅ المستخدم لديه صلاحيات الوصول الكاملة

### 4️⃣ تشغيل الخادم

#### وضع التطوير (مع auto-reload):
```bash
npm run dev
```

#### وضع الإنتاج:
```bash
npm start
```

## ✅ اختبار الاتصال

بعد تشغيل الخادم، افتح المتصفح على:

```
http://localhost:3000/health
```

يجب أن تحصل على رد مثل:

```json
{
  "status": "success",
  "message": "Nazik API is running",
  "timestamp": "2025-10-12T12:00:00.000Z",
  "environment": "development"
}
```

## 🔐 اختبار تسجيل الدخول

### تسجيل عميل جديد:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "phone": "0912345678",
    "password": "123456",
    "city_id": 1,
    "area_id": 1,
    "street": "شارع الجمهورية"
  }'
```

### تسجيل الدخول:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "0912345678",
    "password": "123456"
  }'
```

## 📊 البيانات التجريبية

قاعدة البيانات تحتوي على بيانات تجريبية:

### مستخدمين موجودين:
- **Email:** `omar.admin2025@example.com` - **Phone:** `0922334455` (موظف بصلاحيات كاملة)
- **Email:** `hossam123@gmail.com` - **Phone:** `0910504021` (عميل)

### مدن ومناطق:
- طرابلس (ID: 1) - مناطق: Gergarish, Fashloum, Souq Al Jumaa, Abu Salim, Ain Zara
- بنغازي (ID: 2) - مناطق: Al Sabri, Garyounis, Al Kish, Bu Atni, Laithi
- مصراتة (ID: 3) - مناطق: City Center, Al Skikdar, Dafniya, Zarouq, Tammina

## 🐛 استكشاف الأخطاء

### خطأ الاتصال بقاعدة البيانات:

```
❌ Database connection failed: connect ECONNREFUSED
```

**الحل:**
- تأكد من تشغيل MySQL
- تحقق من معلومات الاتصال في `.env`
- تأكد من السماح بالاتصال من IP الخاص بك

### خطأ في الصلاحيات:

```
Error: ER_ACCESS_DENIED_ERROR
```

**الحل:**
- تحقق من اسم المستخدم وكلمة المرور
- تأكد من أن المستخدم لديه صلاحيات على قاعدة البيانات

### خطأ في Port:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**الحل:**
- غير رقم الـ PORT في ملف `.env`
- أو أوقف العملية التي تستخدم Port 3000

## 📝 ملاحظات مهمة

1. **الأمان:** في الإنتاج، غير جميع المفاتيح السرية في `.env`
2. **قاعدة البيانات:** لا تشارك معلومات الاتصال بقاعدة البيانات
3. **Triggers:** قاعدة البيانات تستخدم Session Variables (@current_user_id)
4. **الترميز:** جميع الردود بصيغة UTF-8 لدعم اللغة العربية

## 🚀 الخطوات التالية

بعد التشغيل الناجح:
1. اختبر جميع الـ endpoints باستخدام Postman
2. راجع الـ logs للتأكد من عدم وجود أخطاء
3. ابدأ في تطوير تطبيق Flutter المتصل بالـ API

## 📞 الدعم

في حال واجهت أي مشكلة، تحقق من:
- سجلات الـ console
- سجلات قاعدة البيانات
- ملف `.env` وتأكد من صحة جميع المعلومات


