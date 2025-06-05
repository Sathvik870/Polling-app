// server/controllers/authController.js
const User = require('../models/User');
const jwt =require('jsonwebtoken');
const crypto = require('crypto'); // For generating tokens
const sendEmail = require('../utils/sendEmail'); // Utility for nodemailer

// Helper to generate JWT
const generateToken = (id, options = {}) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Default expiry
        ...options
    });
};

exports.googleCallback = (req, res) => {
    // Successful authentication, req.user is now available from Passport
    // Ensure the user from Google is marked as verified if they log in this way
    // as Google has already verified their email.
    if (req.user && !req.user.isVerified) {
        req.user.isVerified = true;
        req.user.verificationToken = undefined;
        req.user.verificationTokenExpires = undefined;
        req.user.save({ validateBeforeSave: false }); // Save the update
    }

    const token = generateToken(req.user.id);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&userId=${req.user.id}&displayName=${encodeURIComponent(req.user.displayName)}&email=${req.user.email}`);
};

exports.registerUser = async (req, res) => {
    const { displayName, email, password } = req.body;
    try {
        if (!displayName || !email || !password) {
            return res.status(400).json({ message: 'Please provide display name, email, and password' });
        }
        let userExists = await User.findOne({ email });
        if (userExists) {
            // If user exists but is not verified, allow re-registration to resend verification
            if (!userExists.isVerified) {
                // Update existing unverified user record rather than creating a new one
                userExists.displayName = displayName;
                if (password) { // Only update password if provided again
                    userExists.password = password; // The pre-save hook will hash it
                }
                userExists.verificationToken = crypto.randomBytes(20).toString('hex');
                userExists.verificationTokenExpires = Date.now() + 3600000 * 24; // 24 hours
                await userExists.save(); // This will trigger the pre-save hook for password
                // Resend verification email
                const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${userExists.verificationToken}`;
                const message = `<h1>Email Verification</h1><p>Hi ${userExists.displayName},</p><p>Please verify your email address by clicking the link below:</p><a href="${verificationUrl}" target="_blank">Verify Email Address</a><p>This link will expire in 24 hours.</p>`;
                await sendEmail({ to: userExists.email, subject: 'Verify Your Email for Polling App', text: `Verify URL: ${verificationUrl}`, html: message });
                return res.status(200).json({ message: 'Verification email re-sent. Please check your email.' });
            }
            return res.status(400).json({ message: 'User already exists with this email and is verified.' });
        }

        const user = await User.create({
            displayName,
            email,
            password,
            isVerified: false, // Start as not verified
            verificationToken: crypto.randomBytes(20).toString('hex'),
            verificationTokenExpires: Date.now() + 3600000 * 24 // 24 hours
        });

        // Send verification email
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${user.verificationToken}`;
        const message = `
            <h1>Email Verification</h1>
            <p>Hi ${user.displayName},</p>
            <p>Thank you for registering for Polling App! Please verify your email address by clicking the link below:</p>
            <a href="${verificationUrl}" target="_blank">Verify Email Address</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email for Polling App',
                text: `Please verify your email by visiting this URL: ${verificationUrl}`,
                html: message
            });

            res.status(201).json({
                // We don't send a login token here. User must verify first.
                message: 'Registration successful. Please check your email to verify your account.'
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Potentially delete the user or mark for retry, to prevent unverified users piling up
            // await User.findByIdAndDelete(user._id); // Example: cleanup on email failure
            res.status(500).json({ message: 'Registration successful, but verification email could not be sent. Please try registering again later or contact support.' });
        }

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.params;
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex'); // If storing hashed tokens

        // Find user by the verification token (original or hashed) and ensure it hasn't expired
        // For simplicity here, assuming token stored directly. If hashed:
        // const user = await User.findOne({ verificationToken: hashedToken, verificationTokenExpires: { $gt: Date.now() } });
        const user = await User.findOne({
            verificationToken: token, // Using the raw token directly as stored
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }

        user.isVerified = true;
        user.verificationToken = undefined; // Clear the token
        user.verificationTokenExpires = undefined; // Clear expiry
        await user.save({ validateBeforeSave: false });

        // Optionally, log the user in directly by issuing a token
        const loginToken = generateToken(user.id);
        res.json({
            message: 'Email verified successfully! You can now log in.',
            token: loginToken, // Send token so user can be logged in
             _id: user.id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
        });
        // Or redirect to login page with a success message:
        // res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);

    } catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({ message: 'Server error during email verification.', error: error.message });
    }
};

exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email not found.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'This email is already verified.' });
        }

        // Generate a new token and expiry
        user.verificationToken = crypto.randomBytes(20).toString('hex');
        user.verificationTokenExpires = Date.now() + 3600000 * 24; // 24 hours
        await user.save({ validateBeforeSave: false });

        const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${user.verificationToken}`;
        const message = `<h1>Resent Email Verification</h1><p>Hi ${user.displayName},</p><p>Please verify your email address by clicking the link below:</p><a href="${verificationUrl}" target="_blank">Verify Email Address</a><p>This link will expire in 24 hours.</p>`;

        await sendEmail({
            to: user.email,
            subject: 'Resend: Verify Your Email for Polling App',
            text: `Verify URL: ${verificationUrl}`,
            html: message
        });

        res.status(200).json({ message: 'Verification email re-sent. Please check your inbox.' });

    } catch (error) {
        console.error("Resend verification email error:", error);
        res.status(500).json({ message: 'Server error while resending verification email.', error: error.message });
    }
};


exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified && user.provider !== 'google') { // Google users are auto-verified
            // Check if verification token is expired. If so, prompt to resend.
            if (user.verificationTokenExpires && user.verificationTokenExpires < Date.now()) {
                return res.status(401).json({
                    message: 'Your verification token has expired. Please request a new verification email.',
                    action: 'resend_verification' // Custom flag for frontend
                });
            }
            return res.status(401).json({
                message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                action: 'needs_verification' // Custom flag for frontend
            });
        }

        if (await user.comparePassword(password)) {
            res.json({
                _id: user.id,
                displayName: user.displayName,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

exports.getMe = async (req, res) => {
    // req.user is populated by the 'protect' middleware
    // Ensure we return the most up-to-date user info, especially isVerified status
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json({
        _id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified, // Include verification status
        googleId: user.googleId
    });
};

exports.logoutUser = (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
};


// TODO: Implement forgotPassword, resetPassword
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security, but for debugging you might log
            console.log(`Password reset attempted for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // Store hashed token
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const message = `<h1>Password Reset Request</h1><p>Hi ${user.displayName},</p><p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}" target="_blank">Reset Password</a><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`;

        await sendEmail({
            to: user.email,
            subject: 'Password Reset Request for Polling App',
            text: `Reset URL: ${resetUrl}`,
            html: message
        });

        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error("Forgot password error:", error);
        // Clear tokens if something went wrong to prevent misuse
        if (user) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }
        res.status(500).json({ message: 'Error processing password reset request.' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        if (!password) {
            return res.status(400).json({ message: "Password is required." });
        }
        // Hash the token from the URL to match the stored hashed token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        user.password = password; // Pre-save hook will hash it
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.isVerified = true; // Also mark as verified if they are resetting password
        await user.save();

        // Optionally send a confirmation email
        // await sendEmail({ to: user.email, subject: 'Your Password Has Been Changed', text: 'Your password for Polling App has been successfully changed.' });

        res.status(200).json({ message: 'Password reset successful. You can now log in with your new password.' });

    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: 'Error resetting password.' });
    }
};