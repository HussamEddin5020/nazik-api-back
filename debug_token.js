const jwt = require('jsonwebtoken');

// JWT token from the user
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMDEwMDAwNDYsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzYxMTI3MTk2LCJleHAiOjE3NjE3MzE5OTZ9.iAIotkOZPiE2aJBGDQrIS4xDE3cF73lR9JGpqiGm29U';

try {
  const decoded = jwt.decode(token);
  console.log('Decoded JWT:', decoded);
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  console.log('Current time:', now);
  console.log('Token expires at:', decoded.exp);
  console.log('Token expired:', now > decoded.exp);
  
} catch (error) {
  console.error('Error decoding token:', error);
}
