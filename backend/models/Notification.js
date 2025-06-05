// server/models/Notification.js
const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    link: { type: String }, // e.g., /poll/:pollId/results
    read: { type: Boolean, default: false },
    relatedPollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' }, // Good to have
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Notification', NotificationSchema);