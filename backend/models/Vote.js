// server/models/Vote.js
const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    optionIndex: { type: Number, required: true }, // Index of the option in Poll.options
    voterIdentifier: { type: String, required: true }, // User ID for authenticated, IP for IP-restricted anonymous
    votedAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate votes based on identifier for a specific poll
VoteSchema.index({ poll: 1, voterIdentifier: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);