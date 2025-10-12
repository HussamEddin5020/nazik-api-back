# 📚 توثيق API - نظام نازك

## جدول المحتويات
1. [المصادقة (Authentication)](#المصادقة)
2. [المستخدمين (Users)](#المستخدمين)
3. [العملاء (Customers)](#العملاء)
4. [الطلبات (Orders)](#الطلبات)
5. [العربات (Carts)](#العربات)
6. [الصناديق (Boxes)](#الصناديق)
7. [الشحنات (Shipments)](#الشحنات)
8. [الفواتير (Invoices)](#الفواتير)
9. [العناوين (Addresses)](#العناوين)
10. [لوحة التحكم (Dashboard)](#لوحة-التحكم)

---

## المصادقة

### تسجيل عميل جديد

**Endpoint:** `POST /api/v1/auth/register/customer`

**Request Body:**
```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "0912345678",
  "password": "123456",
  "city_id": 1,
  "area_id": 1,
  "street": "شارع الجمهورية"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم التسجيل بنجاح",
  "data": {
    "user": {
      "id": 1001000046,
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "0912345678",
      "type": "customer",
      "status": "active",
      "customer_id": 2002000014,
      "city_name": "Tripoli",
      "area_name": "Gergarish"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### تسجيل الدخول

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "identifier": "0912345678",
  "password": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": {
      "id": 1001000046,
      "name": "أحمد محمد",
      "type": "customer",
      "permissions": []
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## الطلبات

### إنشاء طلب جديد

**Endpoint:** `POST /api/v1/orders`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "customer_id": 2002000001,
  "position_id": 1,
  "details": {
    "title": "هاتف سامسونج A55",
    "description": "جهاز جديد",
    "notes": "تسليم سريع",
    "color": "أسود",
    "size": "128GB",
    "capacity": "6GB RAM",
    "prepaid_value": 100,
    "original_product_price": 700,
    "commission": 50,
    "total": 850,
    "image_url": "https://example.com/image.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "id": 19990000018,
    "customer_id": 2002000001,
    "position_id": 1,
    "position_name": "جديد",
    "title": "هاتف سامسونج A55",
    "total": 850,
    "created_at": "2025-10-12T12:00:00.000Z"
  }
}
```

### الحصول على طلباتي (للعميل)

**Endpoint:** `GET /api/v1/orders/my-orders`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `page` (optional): رقم الصفحة (default: 1)
- `limit` (optional): عدد العناصر (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "تمت العملية بنجاح",
  "data": {
    "data": [
      {
        "id": 19990000003,
        "position_name": "وصلت الى ليبيا",
        "barcode": "BC-1760022807277",
        "title": "Shirt",
        "total": 120.00,
        "created_at": "2025-09-16T10:36:13.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 20
    }
  }
}
```

### تحديث حالة الطلب

**Endpoint:** `PUT /api/v1/orders/:id/position`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (Staff only)
```

**Request Body:**
```json
{
  "position_id": 5,
  "reason": "تم الاستلام في مخازن تركيا",
  "notes": "الطلب بحالة ممتازة"
}
```

---

## العناوين

### الحصول على المدن

**Endpoint:** `GET /api/v1/addresses/cities`

**Response:**
```json
{
  "success": true,
  "message": "تمت العملية بنجاح",
  "data": [
    {
      "id": 1,
      "name": "Tripoli",
      "created_at": "2025-09-16T09:19:46.000Z"
    },
    {
      "id": 2,
      "name": "Benghazi",
      "created_at": "2025-09-16T09:19:46.000Z"
    }
  ]
}
```

### الحصول على المناطق حسب المدينة

**Endpoint:** `GET /api/v1/addresses/cities/:cityId/areas`

**Response:**
```json
{
  "success": true,
  "message": "تمت العملية بنجاح",
  "data": [
    {
      "id": 1,
      "city_id": 1,
      "name": "Gergarish",
      "created_at": "2025-09-16T09:19:55.000Z"
    }
  ]
}
```

---

## لوحة التحكم

### إحصائيات النظام

**Endpoint:** `GET /api/v1/dashboard/statistics`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (Staff only)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 9,
    "totalCustomers": 8,
    "ordersByPosition": [
      { "name": "تحت الشراء", "count": 4 },
      { "name": "وصلت الى ليبيا", "count": 3 }
    ],
    "activeCarts": 1,
    "totalInvoices": 0,
    "totalRevenue": 0,
    "recentActivity": []
  }
}
```

---

## أكواد الحالة (Status Codes)

| Code | المعنى |
|------|---------|
| 200 | نجاح العملية |
| 201 | تم الإنشاء بنجاح |
| 400 | خطأ في البيانات المدخلة |
| 401 | غير مصادق (يتطلب تسجيل دخول) |
| 403 | ممنوع (لا توجد صلاحية) |
| 404 | غير موجود |
| 409 | تعارض (مثل: البريد مستخدم مسبقاً) |
| 429 | تجاوز الحد المسموح من الطلبات |
| 500 | خطأ في الخادم |

---

## حالات الطلبات (Order Positions)

| ID | الحالة | الوصف |
|----|--------|--------|
| 1 | جديد | طلب جديد |
| 2 | تحت الشراء | جاري شراء المنتج |
| 3 | الاستلام في مخازن تركيا | تم استلام المنتج في تركيا |
| 4 | جاري الشحن | جاري شحن المنتج |
| 5 | وصلت الى ليبيا | وصل المنتج لليبيا |
| 6 | تم الشحن | تم الشحن |
| 7 | وصل إلى ليبيا | وصل للمستودع في ليبيا |
| 8 | قيد التحضير | جاري تحضير الطلب للتسليم |
| 9 | جاهز للتسليم | جاهز للاستلام |
| 10 | قيد التوصيل | في طريقه للعميل |
| 11 | تم التسليم | تم تسليم الطلب |
| 12 | ملغي | تم إلغاء الطلب |
| 13 | قيد الإرجاع | جاري إرجاع المنتج |
| 14 | تمت إعادته إلى تركيا | تم إرجاعه لتركيا |
| 15 | مُرجع | تم الإرجاع |
| 16 | جزئي | تسليم جزئي |

---

## الصلاحيات (Permissions)

| ID | الاسم | الوصف |
|----|-------|--------|
| 4004000001 | view | عرض السجلات |
| 4004000002 | add | إضافة سجلات |
| 4004000003 | update | تحديث سجلات |
| 4004000004 | delete | حذف سجلات |
| 4004000005 | confirm_deposit | تأكيد الإيداع |
| 4004000006 | manage_fx | إدارة تحويل العملات |

---

## أمثلة على استخدام الـ Headers

### مصادقة بسيطة:
```http
GET /api/v1/orders/my-orders HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### إرسال بيانات JSON:
```http
POST /api/v1/orders HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "customer_id": 2002000001,
  "details": { ... }
}
```

---

Made with ❤️ by Nazik Team


