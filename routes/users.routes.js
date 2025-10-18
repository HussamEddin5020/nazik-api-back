const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllPermissions,
  getAllActions,
  assignPermission,
  removePermission,
  bulkAssignPermissions
} = require('../controllers/users.controller');
const { verifyToken, checkUserType } = require('../middleware/auth');

// Apply authentication to all routes
router.use(verifyToken);
router.use(checkUserType(['user'])); // Only system users can access

// Get all permissions and actions (for UI dropdowns)
router.get('/permissions/all', getAllPermissions);
router.get('/actions/all', getAllActions);

// User CRUD operations
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Permission management
router.post('/:id/permissions', assignPermission);
router.delete('/:id/permissions', removePermission);
router.post('/:id/permissions/bulk', bulkAssignPermissions);

module.exports = router;



