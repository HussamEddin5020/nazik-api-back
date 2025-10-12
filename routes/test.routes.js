const express = require('express');
const router = express.Router();

// Test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with authentication
router.get('/test-auth', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authenticated test endpoint is working',
    user: {
      id: req.user.id,
      name: req.user.name,
      type: req.user.type
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
