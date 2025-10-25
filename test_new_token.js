const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMDEwMDAwNDYsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzYxMzc3NjcwLCJleHAiOjE3NjE5ODI0NzB9._fBSDSE2-QKnkGMmVI6UL5w1ieivhiPyaHv1i4aHlZU';

const options = {
  hostname: 'my-api-khyj.onrender.com',
  port: 443,
  path: '/api/v1/auth/permissions',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
