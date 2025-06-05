// server/config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'] // Add scope for email
    },
    async (accessToken, refreshToken, profile, done) => {
        const newUser = {
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value, // Make sure to request email scope
            provider: 'google', // Add provider
            isVerified: true // You might want to add profile.photos[0].value for an avatar
        };

        try {
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                done(null, user);
            } else {
                // Check if user exists with this email (e.g., signed up via email/password before)
                user = await User.findOne({ email: profile.emails[0].value });
                if (user) {
                    // Link Google ID to existing email account
                    user.googleId = profile.id;
                    user.displayName = profile.displayName; // Update display name if preferred
                    await user.save();
                    done(null, user);
                } else {
                    // Create new user
                    user = await User.create(newUser);
                    done(null, user);
                }
            }
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};