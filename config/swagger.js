/**
 * Swagger API Documentation Configuration
 * يمكن استخدامه مستقبلاً لتوثيق API تلقائياً
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Nazik E-Commerce API',
    version: '1.0.0',
    description: 'نظام إدارة الطلبات والشحن - واجهة برمجية متكاملة',
    contact: {
      name: 'Nazik Team',
      email: 'support@nazik.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://api.nazik.com/api/v1',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    { name: 'Authentication', description: 'المصادقة وتسجيل الدخول' },
    { name: 'Users', description: 'إدارة المستخدمين' },
    { name: 'Customers', description: 'إدارة العملاء' },
    { name: 'Orders', description: 'إدارة الطلبات' },
    { name: 'Carts', description: 'إدارة العربات' },
    { name: 'Boxes', description: 'إدارة الصناديق' },
    { name: 'Shipments', description: 'إدارة الشحنات' },
    { name: 'Invoices', description: 'إدارة الفواتير' },
    { name: 'Addresses', description: 'المدن والمناطق' },
    { name: 'Dashboard', description: 'لوحة التحكم' },
    { name: 'Audit', description: 'سجلات التدقيق' }
  ]
};

module.exports = swaggerDefinition;

