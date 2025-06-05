// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Existing route
router.get('/polls', protect, userController.getUserPolls);

// NEW: Get voting history for the logged-in user
router.get('/votes', protect, userController.getUserVotes);

// NEW: Get notifications for the logged-in user
router.get('/notifications', protect, userController.getUserNotifications);

// NEW: Mark a notification as read (example)
router.put('/notifications/:notificationId/read', protect, userController.markNotificationRead);
router.get('/invited-polls', protect, userController.getUserInvitedPolls);
module.exports = router;