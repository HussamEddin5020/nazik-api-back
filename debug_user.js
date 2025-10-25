const mysql = require('mysql2/promise');

async function checkUserData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nzaik_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Check user data
    const [users] = await connection.execute(
      'SELECT id, name, email, phone, type, status FROM users WHERE id = ?',
      [1001000046]
    );

    console.log('User data:', users[0]);

    // Check user roles
    const [roles] = await connection.execute(`
      SELECT ur.*, r.name as role_name, r.description 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = ? AND ur.is_active = 1
    `, [1001000046]);

    console.log('User roles:', roles);

    // Check permissions
    const [permissions] = await connection.execute(`
      SELECT DISTINCT p.name, p.description, p.module, p.action
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN new_permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ?
        AND ur.is_active = 1
        AND r.is_active = 1
        AND rp.is_active = 1
        AND p.is_active = 1
      ORDER BY p.module, p.name
    `, [1001000046]);

    console.log('User permissions:', permissions);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUserData();
