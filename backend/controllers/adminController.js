// backend/controllers/adminController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Poll = require('../models/Poll');
const asyncHandler = require('express-async-handler'); // Optional

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password'); // Exclude passwords
    res.json(users);
});

// @desc    Get all polls (Admin)
// @route   GET /api/admin/polls
// @access  Private/Admin
exports.getAllPollsAdmin = asyncHandler(async (req, res) => {
    const polls = await Poll.find({}).populate('creator', 'displayName email').sort({ createdAt: -1 });
    res.json(polls);
});

// @desc    Get site statistics (Admin)
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getSiteStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalPolls = await Poll.countDocuments();
    // For totalVotes, you might need to aggregate from the Polls or a separate Votes collection
    // This is a simplified example for totalVotes
    const allPolls = await Poll.find({});
    const totalVotes = allPolls.reduce((acc, poll) => {
        return acc + poll.options.reduce((sum, option) => sum + option.votes, 0);
    }, 0);

    res.json({ totalUsers, totalPolls, totalVotes });
});

// @desc    Delete a user (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        // Add any pre-deletion logic here (e.g., what to do with user's polls?)
        await User.deleteOne({ _id: req.params.id }); // Updated delete method
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete any poll (Admin)
// @route   DELETE /api/admin/polls/:id
// @access  Private/Admin
exports.deletePollAdmin = asyncHandler(async (req, res) => {
    console.log(`Attempting to delete poll with ID: ${req.params.id}`);

    let poll;
    // Now mongoose.Types.ObjectId.isValid will work because mongoose is defined
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        poll = await Poll.findById(req.params.id);
    } else {
        // If you also want to allow deletion by shortId
        poll = await Poll.findOne({ shortId: req.params.id });
    }
    console.log('Poll found for deletion:', poll);

    if (poll) {
        // await Vote.deleteMany({ poll: poll._id }); // If you have this
        await Poll.deleteOne({ _id: poll._id });
        console.log('Poll removed successfully');
        res.json({ message: 'Poll removed' });
    } else {
        console.log('Poll not found for deletion');
        res.status(404);
        throw new Error('Poll not found');
    }
});