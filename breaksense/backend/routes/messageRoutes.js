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
        const { user1, user2, requesterRole } = req.query;
        let queryFilter = {
            $or: [
                { sender: user1, recipient: user2 },
                { sender: user2, recipient: user1 }
            ]
        };

        if (requesterRole === 'student') {
            queryFilter.deletedByStudent = { $ne: true };
        } else if (requesterRole === 'counselor') {
            queryFilter.deletedByCounselor = { $ne: true };
        }

        const messages = await Message.find(queryFilter).sort({ createdAt: 1 });
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

// Update a message (Edit)
router.put('/update/:messageId', async (req, res) => {
    try {
        const { text } = req.body;
        const message = await Message.findByIdAndUpdate(req.params.messageId, { text }, { new: true });
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete a message (Soft delete based on requester role; hard delete if deleted by both)
router.delete('/delete/:messageId', async (req, res) => {
    try {
        const { role } = req.query;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.json({ success: true });
        }

        if (role === 'counselor') {
            message.deletedByCounselor = true;
        } else {
            // Default to student role
            message.deletedByStudent = true;
        }

        if (message.deletedByStudent && message.deletedByCounselor) {
            await Message.findByIdAndDelete(messageId);
        } else {
            await message.save();
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
