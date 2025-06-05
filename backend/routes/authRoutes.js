// server/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`, session: false }), // session: false as we use JWT
    authController.googleCallback // Controller to issue JWT
);

// @desc    Register with email/password
// @route   POST /auth/register
router.post('/register', authController.registerUser);

// @desc    Login with email/password
// @route   POST /auth/login
router.post('/login', authController.loginUser);

// @desc    Get current user (protected)
// @route   GET /auth/me
router.get('/me', protect, authController.getMe);

// @desc    Logout user (can be just client-side token removal)
// @route   POST /auth/logout
router.post('/logout', authController.logoutUser); // Optional server-side logic if needed (e.g. token blacklisting)

// TODO: Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', protect, authController.resendVerificationEmail);

// TODO: Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;