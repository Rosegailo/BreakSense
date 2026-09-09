const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Break = require('../models/Break');

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Password validation
        const minLength = 8;
        if (password.length < minLength || !/\d/.test(password) || !/[!@#$%^&*()]/.test(password) || !/[A-Z]/.test(password)) {
            return res.status(400).json({ success: false, message: "Password too weak." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        res.json({ success: true, message: "User registered", userId: newUser._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect password" });

        res.json({ 
            success: true, 
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                pomodoro_duration: user.pomodoro_duration,
                sessions_per_cycle: user.sessions_per_cycle
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- UPDATE PROFILE ---
router.put('/update-profile', async (req, res) => {
    try {
        const { userId, firstName, lastName, pomodoroDuration, sessionsPerCycle } = req.body;
        const updateData = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (pomodoroDuration) updateData.pomodoro_duration = pomodoroDuration;
        if (sessionsPerCycle) updateData.sessions_per_cycle = sessionsPerCycle;

        await User.findByIdAndUpdate(userId, updateData);
        res.json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- RESET ACCOUNT ---
router.delete('/reset-account/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await Break.deleteMany({ user_id: userId });
        await User.findByIdAndUpdate(userId, {
            SessionsToday: 0,
            TotalStudyTimeToday: 0,
            DayStreak: 0,
            LastStudyDate: null
        });
        res.json({ success: true, message: "Account data cleared." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- GET COUNSELORS ---
router.get('/counselors', async (req, res) => {
    try {
        const counselors = await User.find({ role: 'counselor' }, 'first_name last_name email');
        res.json(counselors);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- GET ALL STUDENTS (For Counselor Dashboard) ---
router.get('/students', async (req, res) => {
    try {
        // Find all students and include their stats
        const students = await User.find({ role: 'student' }, 'first_name last_name email SessionsToday TotalStudyTimeToday DayStreak');
        res.json(students);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
