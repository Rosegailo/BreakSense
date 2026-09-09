const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// Send a message
router.post('/send', async (req, res) => {
    try {
        const { senderId, recipientId, text } = req.body;
        const message = new Message({ sender: senderId, recipient: recipientId, text });
        await message.save();
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get chat history between two users
router.get('/history', async (req, res) => {
    try {
        const { user1, user2 } = req.query;
        const messages = await Message.find({
            $or: [
                { sender: user1, recipient: user2 },
                { sender: user2, recipient: user1 }
            ]
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all students who have messaged the counselor (for counselor dashboard)
router.get('/conversations/:counselorId', async (req, res) => {
    try {
        const { counselorId } = req.params;
        const messages = await Message.find({ recipient: counselorId }).distinct('sender');
        const students = await User.find({ _id: { $in: messages } }, 'first_name last_name email');
        res.json(students);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
