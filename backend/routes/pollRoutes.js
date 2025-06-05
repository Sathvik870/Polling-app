// server/routes/pollRoutes.js
const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { protect } = require('../middleware/authMiddleware'); // We'll create this

// GET /api/polls - Get all public polls (or polls user has access to)
router.get('/', pollController.getPolls);

// POST /api/polls - Create a new poll (requires authentication)
router.post('/', protect, pollController.createPoll);

// GET /api/polls/:id - Get a single poll by its shortId or MongoDB ID
router.get('/:id', pollController.getPollById);

// PUT /api/polls/:id - Update a poll (requires auth & ownership)
router.put('/:id', protect, pollController.updatePoll);
router.post('/:id/stop', protect, pollController.stopPoll);
// DELETE /api/polls/:id - Delete a poll (requires auth & ownership)
router.delete('/:id', protect, pollController.deletePoll);

// POST /api/polls/:id/vote - Cast a vote // protect middleware might be added based on poll settings
router.post('/:id/vote', protect, pollController.castVote);
module.exports = router;