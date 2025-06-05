// server/models/Poll.js
const mongoose = require('mongoose');
const shortid = require('shortid'); // For generating short URLs

const OptionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    votes: { type: Number, default: 0 }
});

const PollSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true },
    options: [OptionSchema],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
    allowedVoters: [{ type: String, lowercase: true, trim: true }], // Emails for private polls
    votingType: { type: String, enum: ['anonymous', 'authenticated'], default: 'authenticated' },
    // 'ip' means one vote per IP. 'email' means one vote per authenticated user email.
    // 'device' would require more complex fingerprinting, often frontend assisted.
    voteRestriction: { type: String, enum: ['none', 'ip', 'email'], default: 'none' },
    expiresAt: { type: Date },
    showResults: { type: String, enum: ['always', 'after_vote', 'after_expiry'], default: 'always' },
    allowMultipleChoices: { type: Boolean, default: false },
    shortId: { type: String, default: shortid.generate, unique: true }, // For short URLs
    qrCodeUrl: String, // Store URL to QR code image (can be generated on demand or stored)
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: {
    type: String,
    enum: ['active', 'scheduled', 'closed', 'archived'],
    default: 'active', // <--- THIS SETS IT TO 'active' FOR NEW POLLS BY DEFAULT
    index: true},allowDeadlineLater: { type: Boolean, default: false },
}, { timestamps: true }); // `timestamps: true` automatically adds createdAt and updatedAt

module.exports = mongoose.model('Poll', PollSchema);