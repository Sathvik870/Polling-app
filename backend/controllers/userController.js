// server/controllers/userController.js
const Poll = require('../models/Poll');
const User = require('../models/User');
const Vote = require('../models/Vote'); // Good to have if you add more user-specific functions
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

// @desc    Get polls created by the logged-in user
// @route   GET /api/user/polls
// @access  Private
exports.getUserPolls = asyncHandler(async (req, res) => {
    // req.user is populated by the 'protect' middleware
    if (!req.user || !req.user._id) {
        res.status(401); // Unauthorized
        throw new Error('Not authorized, no user found in request');
    }

    const polls = await Poll.find({ creator: req.user._id })
                             .sort({ createdAt: -1 })
                             .populate('creator', 'displayName email'); // Populate only if these fields exist on User model

    // Poll.find() returns an empty array if no documents match, not null or undefined.
    // So, checking `if (polls)` will always be true if the query executes without error.
    // The `else` block with 404 was misleading here for Poll.find().
    res.json(polls); // Send the array (which might be empty)
});

// @desc    Get logged-in user's profile
// @route   GET /api/user/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
    // req.user is populated by 'protect' middleware and usually contains the user document
    // (minus the password, if you selected it out in authMiddleware)
    if (req.user) {
        // If req.user doesn't have all fields (e.g. if it was a lean version), fetch fresh:
        // const user = await User.findById(req.user._id).select('-password');
        // if (user) {
        //     res.json(user);
        // } else {
        //     res.status(404);
        //     throw new Error('User not found');
        // }
        res.json(req.user); // Assuming req.user is sufficient
    } else {
        res.status(401);
        throw new Error('Not authorized');
    }
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.displayName = req.body.displayName || user.displayName;
        user.email = req.body.email || user.email; // Be cautious allowing email changes, might need re-verification

        // Add password change logic if needed, ensuring to hash the new password
        // if (req.body.password) {
        //     user.password = req.body.password;
        // }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            displayName: updatedUser.displayName,
            email: updatedUser.email,
            role: updatedUser.role,
            // Re-issue a token if sensitive info like role or email changed,
            // or if your token payload includes these and needs to be fresh.
            // token: generateToken(updatedUser._id), // You'd need generateToken function here
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// NEW: Get voting history for the user
exports.getUserVotes = asyncHandler(async (req, res) => {
    const votes = await Vote.find({ voterIdentifier: req.user._id })
    .populate({
        path: 'poll', // Field name in your VoteSchema that refs Poll
        select: 'question shortId _id options'
    })
    .sort({ votedAt: -1 });

    const populatedVotes = votes.map(vote => {
        let optionText = "N/A (Option or poll data missing)";
        // Check if poll and its options are populated and if optionIndex is valid
        if (vote.poll && vote.poll.options && vote.poll.options[vote.optionIndex]) {
            optionText = vote.poll.options[vote.optionIndex].text;
        } else if (vote.poll) {
            console.warn(`Could not find option text for vote ${vote._id} in poll ${vote.poll._id} at index ${vote.optionIndex}`);
        } else {
            console.warn(`Poll data missing for vote ${vote._id}`);
        }

        return {
            _id: vote._id,
            poll: vote.poll ? { // Send a leaner poll object to the frontend
                _id: vote.poll._id,
                shortId: vote.poll.shortId,
                question: vote.poll.question,
            } : null, // Handle case where poll might be null (though populate should bring it or null)
            optionText: optionText,
            votedAt: vote.votedAt
        };
    }).filter(vote => vote.poll); // Filter out votes where poll data couldn't be attached (e.g., poll deleted)

    res.json(populatedVotes);
});


// NEW: Get notifications for the user
exports.getUserNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ userId: req.user._id })
                                        .sort({ createdAt: -1 })
                                        .limit(20); // Limit the number of notifications
    res.json(notifications);
});

// NEW: Mark notification as read
exports.markNotificationRead = asyncHandler(async (req, res) => {
    const notificationId = req.params.notificationId;
    // const notification = await Notification.findOneAndUpdate(
    //     { _id: notificationId, userId: req.user._id }, // Ensure user owns notification
    //     { read: true },
    //     { new: true }
    // );
    // if (!notification) {
    //     res.status(404);
    //     throw new Error('Notification not found or not authorized');
    // }
    // res.json(notification);
    
    // MOCK RESPONSE
    console.log(`Mock: Marking notification ${notificationId} as read for user ${req.user.id}`);
    res.json({ _id: notificationId, message: "Mock notification marked as read", read: true, userId: req.user.id, createdAt: new Date() });
});
// Add other controller functions here (getUserVotes, etc.)

exports.getUserInvitedPolls = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.email) {
        res.status(401);
        throw new Error('Not authorized, user email not found in request');
    }

    const userEmail = req.user.email.toLowerCase();

    const invitedPolls = await Poll.find({
        isPublic: false, // Only private polls
        allowedVoters: userEmail, // User's email is in the allowedVoters list
        creator: { $ne: req.user._id } // User is NOT the creator of the poll
    })
    .populate('creator', 'displayName email')
    .sort({ createdAt: -1 });

    res.json(invitedPolls);
});