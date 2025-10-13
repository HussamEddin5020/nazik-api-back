// Test script to check user type

const API_BASE = 'https://my-api-khyj.onrender.com/api/v1';

async function testUserType() {
  try {
    console.log('🔍 Testing user type...');
    
    // Login
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: '1001000039',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login response:', loginData.success);
    
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Token received:', token.substring(0, 50) + '...');
    
    // Check user type from login response
    console.log('👤 User type from login:', loginData.data.user.type);
    console.log('👤 User name:', loginData.data.user.name);
    
    // Test dashboard (should work)
    console.log('\n🔍 Testing dashboard...');
    const dashboardResponse = await fetch(`${API_BASE}/dashboard/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 Dashboard status:', dashboardResponse.status);
    
    // Test audit logs (should fail if user type is wrong)
    console.log('\n🔍 Testing audit logs...');
    const auditResponse = await fetch(`${API_BASE}/audit-logs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📋 Audit logs status:', auditResponse.status);
    
    if (auditResponse.status !== 200) {
      const auditData = await auditResponse.json();
      console.log('❌ Audit logs error:', auditData.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUserType();
