// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;
    console.log(`[Protect Middleware] Request to: ${req.originalUrl}`); // Log the URL
    console.log('[Protect Middleware] Headers:', JSON.stringify(req.headers));
    console.log(`[Protect Middleware] ENTERED for URL: ${req.originalUrl}`); // NEW LOG
    console.log(`[Protect Middleware] Method: ${req.method}`); // NEW LOG
    console.log('[Protect Middleware] Full req.headers.authorization:', req.headers.authorization);
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[Protect Middleware] Token extracted:', token.substring(0, 20) + "...");
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[Protect Middleware] Token decoded. User ID:', decoded.id);
            req.user = await User.findById(decoded.id).select('-password'); // Attach user to request, exclude password
            if (!req.user) {
                console.warn('[Protect Middleware] User not found for decoded ID:', decoded.id);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            console.log('[Protect Middleware] User attached to req.user:', req.user.email);
            next();
        } catch (error) {
            console.error('[Protect Middleware] Token verification/user fetch error:', error.message); 
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }else { // This block handles missing or malformed Authorization header
        console.warn(`[Protect Middleware] FAILED CHECK: req.headers.authorization is "${req.headers.authorization}" for URL ${req.originalUrl}. Not a Bearer token or missing.`);
        return res.status(401).json({ message: 'Not authorized, no token (or not Bearer)' }); // Ensure this return is here
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
exports.tryProtect = async (req, res, next) => {
    let token;
    // ... (logging as before) ...
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (req.user) {
                console.log('[TryProtect Middleware] User attached to req.user:', req.user.email);
            } else {
                console.warn('[TryProtect Middleware] User not found for decoded ID, req.user is null.');
            }
        } catch (error) {
            console.warn('[TryProtect Middleware] Token present but invalid/expired:', error.message);
            req.user = null; // Explicitly set to null on error
        }
    } else {
        req.user = null; // No token provided
    }
    next(); // Always call next, req.user might be null
};
exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};