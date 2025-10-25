const jwt = require('jsonwebtoken');

// Generate new token for user 1001000046
const userId = 1001000046;
const type = 'user';
const secret = 'supersecretkey'; // Using the same secret as in ENV_SETUP.md

const token = jwt.sign(
  { userId, type },
  secret,
  { expiresIn: '7d' }
);

console.log('New JWT Token:', token);

// Decode to verify
const decoded = jwt.decode(token);
console.log('Decoded:', decoded);
