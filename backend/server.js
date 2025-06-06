// server/server.js
require('dotenv').config(); // Load .env variables at the very top

const express = require('express');
const mongoose = require('mongoose'); // Import mongoose ONCE at the top
const cors = require('cors');
const morgan = require('morgan'); // For HTTP request logging
const http = require('http'); // For creating HTTP server for Socket.IO
const { Server } = require("socket.io"); // Socket.IO server
const passport = require('passport'); // For authentication strategies
const rateLimit = require('express-rate-limit'); // For rate limiting
const cron = require('node-cron'); // For the scheduler

// --- Model Imports (needed for Scheduler and potentially other direct use in server.js) ---
const Poll = require('./models/Poll');
const Vote = require('./models/Vote');
const Notification = require('./models/Notification');
// const User = require('./models/User'); // Only if User specific fields are needed directly here

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app); // Create HTTP server from Express app
const io = new Server(server, { // Initialize Socket.IO server and attach to HTTP server
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173', // Your Vite frontend URL
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5001; // Define your server port

// --- Middleware ---
// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true // If you need to send cookies or use authorization headers with credentials
}));

// Body Parsers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// HTTP Request Logging (Morgan)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Use 'dev' format for concise output, colored by response status
}

// Passport Middleware
require('./config/passport')(passport); // Pass passport for configuration
app.use(passport.initialize()); // Initialize Passport

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 200, // Higher limit for dev, lower for prod
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(limiter); // Apply to all requests

// Make io (Socket.IO server instance) accessible in request handlers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- API Routes ---
const authRoutes = require('./routes/authRoutes');
const pollRoutes = require('./routes/pollRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Assuming you have this file created

app.use('/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes); // Make sure adminRoutes.js exports a router

// Basic Root Route (Optional)
app.get('/', (req, res) => {
    res.send(`Polling App API Running in ${process.env.NODE_ENV || 'development'} mode!`);
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
    console.log('Socket.IO: A user connected:', socket.id);

    socket.on('join_poll_room', (pollId) => {
        if (pollId) {
            const roomName = pollId.toString(); // Ensure room name is a string
            socket.join(roomName);
            console.log(`Socket.IO: User ${socket.id} joined room ${roomName}`);
        } else {
            console.warn(`Socket.IO: User ${socket.id} tried to join a room with no pollId.`);
        }
    });

    // Example: Leaving a room (optional, if needed for specific logic)
    // socket.on('leave_poll_room', (pollId) => {
    //     if (pollId) {
    //         socket.leave(pollId.toString());
    //         console.log(`Socket.IO: User ${socket.id} left room ${pollId}`);
    //     }
    // });

    socket.on('disconnect', () => {
        console.log('Socket.IO: User disconnected:', socket.id);
        // Here you might also remove the socket.id from any user-socket mapping if you implement that
    });
});

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected...');
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message); // Log only the error message for clarity
        // console.error(err); // Uncomment for the full error object during deep debugging
        process.exit(1); // Exit process with failure
    });


// --- Scheduler for Expired Polls ---
// Runs every minute.
cron.schedule('* * * * *', async () => {
    console.log('Scheduler: Checking for expired polls at', new Date().toLocaleTimeString());
    try {
        const now = new Date();
        const expiredPolls = await Poll.find({
            status: 'active',
            expiresAt: { $ne: null, $lte: now }
        }).populate('creator', 'displayName'); // Populate creator for displayName

        if (expiredPolls.length === 0) {
            console.log('Scheduler: No polls expired in this run.');
            return;
        }
        console.log(`Scheduler: Found ${expiredPolls.length} poll(s) to close.`);
        for (const poll of expiredPolls) {
            poll.status = 'closed';
            // poll.expiresAt = now; // Optionally, set the exact expiry time to now
            await poll.save();
            console.log(`Scheduler: Poll "${poll.question}" (ID: ${poll._id}) status set to 'closed'.`);

            // Find unique voter ObjectIds for this poll
            const votes = await Vote.find({ poll: poll._id }).select('voterIdentifier').lean();
            const voterUserObjectIds = [...new Set(
                votes.map(v => v.voterIdentifier)
                     .filter(idString => mongoose.Types.ObjectId.isValid(idString))
                        .map(idString => new mongoose.Types.ObjectId(idString))
            )];

            const usersToNotifyIdsForSocket = [poll.creator._id.toString()]; // Start with creator for socket event

            // Create DB Notifications for distinct voters (excluding the creator)
            for (const userId of voterUserObjectIds) {
                if (poll.creator._id.toString() !== userId.toString()) {
                    await Notification.create({
                        userId: userId, // Stored as ObjectId
                        message: `Results for the poll "${poll.question}" you voted in are now published!`,
                        link: `/poll/${poll.shortId || poll._id}/results`,
                        relatedPollId: poll._id
                    });
                    if (!usersToNotifyIdsForSocket.includes(userId.toString())) {
                        usersToNotifyIdsForSocket.push(userId.toString());
                    }
                }
            }

            // Create DB Notification for the creator (if they didn't vote, or a specific "your poll expired" message)
            const creatorVoted = voterUserObjectIds.some(voterId => voterId.equals(poll.creator._id));
            if (!creatorVoted) { // If creator didn't vote, they wouldn't be in voterUserObjectIds
                 await Notification.create({
                    userId: poll.creator._id,
                    message: `Results for your poll "${poll.question}" are published (it expired).`,
                    link: `/poll/${poll.shortId || poll._id}/results`,
                    relatedPollId: poll._id
                });
            }
            // If creator did vote, they are already in usersToNotifyIdsForSocket.
            // The DB notification for them as a voter would have been created above.
            // You might want to tailor the message if creator === voter.

            console.log(`Scheduler: DB Notifications generation complete for poll "${poll.question}".`);

            // Emit 'results_published_for_poll' for real-time toast notifications
            if (io) { // Ensure io is available
                const resultsPublishedEventData = {
                    pollId: poll._id.toString(),
                    pollShortId: poll.shortId,
                    pollQuestion: poll.question,
                    notifiedUserIds: [...new Set(usersToNotifyIdsForSocket)] // Ensure unique string IDs
                };
                io.emit('results_published_for_poll', resultsPublishedEventData);
                console.log(`Scheduler: Emitted 'results_published_for_poll' for poll ${poll._id} to users: ${usersToNotifyIdsForSocket.join(', ')}`);
            }

            // Emit a general 'poll_closed' event for UI updates (e.g., on PollVotingPage)
            if (io) {
                 const pollClosedEventData = {
                     _id: poll._id.toString(),
                     shortId: poll.shortId,
                     status: poll.status,
                     expiresAt: poll.expiresAt.toISOString(), // Send as ISO string
                     question: poll.question
                 };
                 io.to(poll._id.toString()).emit('poll_closed', pollClosedEventData);
                 if(poll.shortId) {
                     io.to(poll.shortId).emit('poll_closed', pollClosedEventData);
                 }
                 console.log(`Scheduler: Emitted 'poll_closed' for poll ${poll._id}`);
            }
        }
    } catch (error) {
        console.error('Scheduler Error processing expired polls:', error);
    }
});
// --- End Scheduler ---


// --- Global Error Handling Middleware ---
// This should be defined AFTER all other app.use() and routes calls
app.use((err, req, res, next) => {
    console.error("Global Error Handler - Message:", err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error("Global Error Handler - Stack:", err.stack);
    }
    
    // If err has a statusCode, use it, otherwise check res.statusCode.
    // If res.statusCode is 200 (OK) but we are in an error handler, default to 500.
    const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    
    res.status(statusCode).json({
        message: err.message || 'An unexpected server error occurred!',
        // Only send the stack trace in development mode for security
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
});

// --- Start the HTTP Server (which includes the Express app and Socket.IO) ---
server.listen(PORT, () => {
    console.log(`Server with Socket.IO running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});