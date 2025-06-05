// server/routes/adminRoutes.js (Example)
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController'); // You'll create this

// Example: GET all users (admin only)
router.get('/users', protect, authorizeAdmin, adminController.getAllUsers);
// Example: GET all polls (admin only)
router.get('/polls', protect, authorizeAdmin, adminController.getAllPollsAdmin);
// Example: GET site stats (admin only)
router.get('/stats', protect, authorizeAdmin, adminController.getSiteStats);
// Example: DELETE a user (admin only)
router.delete('/users/:id', protect, authorizeAdmin, adminController.deleteUser);
// Example: DELETE any poll (admin only)
router.delete('/polls/:id', protect, authorizeAdmin, adminController.deletePollAdmin);

module.exports = router;