/**
 * Authentication & User Control Routes
 * Handles user authentication, profile management, counselor student directory
 * retrieval, risk level assignments, and time-limited analytics permission workflows.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Break = require('../models/Break');
const Message = require('../models/Message');

/**
 * POST /api/auth/signup
 * Registers a new student or counselor account with encrypted credentials.
 */
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

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

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns session user details.
 */
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
                id: user._id.toString(),
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

/**
 * PUT /api/auth/update-profile
 * Updates user profile names and Pomodoro timer preferences.
 */
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

/**
 * DELETE /api/auth/reset-account/:userId
 * Resets student session statistics and clears break logs.
 */
router.delete('/reset-account/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await Break.deleteMany({ user_id: userId });
        await Message.updateMany(
            { $or: [{ sender: userId }, { recipient: userId }] },
            { $set: { deletedByStudent: true } }
        );
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

/**
 * GET /api/auth/counselors
 * Returns all registered counselor accounts for student consultation linking.
 */
router.get('/counselors', async (req, res) => {
    try {
        const counselors = await User.find({ role: 'counselor' }, 'first_name last_name email');
        res.json(counselors);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/auth/students
 * Fetches all student directory records for the counselor dashboard,
 * sorted by most recent message activity and newest account registration.
 */
router.get('/students', async (req, res) => {
    try {
        const students = await User.find(
            { role: 'student' },
            'first_name last_name email SessionsToday TotalStudyTimeToday DayStreak dataSharingPermission analyticsAccessStatus permissionExpiry riskLevel createdAt'
        ).sort({ createdAt: -1 });

        const now = new Date();
        const studentList = [];

        for (let s of students) {
            if (s.permissionExpiry && now > new Date(s.permissionExpiry)) {
                s.analyticsAccessStatus = 'none';
                s.dataSharingPermission = 'none';
                s.permissionExpiry = null;
                await s.save();
            }

            const studentObj = s.toObject();
            const latestMsg = await Message.findOne({ sender: s._id }).sort({ createdAt: -1 });
            studentObj.lastMessageTime = latestMsg && latestMsg.createdAt ? new Date(latestMsg.createdAt).getTime() : 0;

            studentList.push(studentObj);
        }

        studentList.sort((a, b) => {
            const timeA = a.lastMessageTime || 0;
            const timeB = b.lastMessageTime || 0;
            if (timeA !== timeB) return timeB - timeA;

            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        res.json(studentList);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/auth/update-risk-level
 * Updates counselor risk assessment status for a student (WATCH LIST, STABLE, HIGH RISK).
 */
router.put('/update-risk-level', async (req, res) => {
    try {
        const { userId, riskLevel } = req.body;
        if (!['WATCH LIST', 'STABLE', 'HIGH RISK'].includes(riskLevel)) {
            return res.status(400).json({ success: false, message: "Invalid risk level." });
        }
        const updatedUser = await User.findByIdAndUpdate(userId, { riskLevel }, { new: true });
        res.json({ success: true, message: "Risk level updated.", riskLevel: updatedUser.riskLevel });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/auth/request-access
 * Initiates an analytics access request from counselor to student.
 */
router.put('/request-access', async (req, res) => {
    try {
        const { userId } = req.body;
        await User.findByIdAndUpdate(userId, { analyticsAccessStatus: 'pending' });
        res.json({ success: true, message: "Request sent to student." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/auth/update-permissions
 * Grants time-limited analytics data sharing permissions (24 hours or 7 days).
 */
router.put('/update-permissions', async (req, res) => {
    try {
        const { userId, dataSharingPermission, analyticsAccessStatus } = req.body;
        let permissionExpiry = null;

        if (dataSharingPermission === '7days') {
            permissionExpiry = new Date();
            permissionExpiry.setDate(permissionExpiry.getDate() + 7);
        } else if (dataSharingPermission === '24hours' || dataSharingPermission === 'session') {
            permissionExpiry = new Date();
            permissionExpiry.setHours(permissionExpiry.getHours() + 24);
        }

        const updateData = { dataSharingPermission, permissionExpiry };
        if (analyticsAccessStatus) updateData.analyticsAccessStatus = analyticsAccessStatus;

        await User.findByIdAndUpdate(userId, updateData);
        res.json({ success: true, message: "Permissions updated." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/auth/profile/:userId
 * Retrieves full user profile information and current permission states.
 */
router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * PUT /api/auth/revoke-access
 * Immediately revokes student analytics sharing permissions.
 */
router.put('/revoke-access', async (req, res) => {
    try {
        const { userId } = req.body;
        await User.findByIdAndUpdate(userId, {
            dataSharingPermission: 'none',
            analyticsAccessStatus: 'none',
            permissionExpiry: null
        });
        res.json({ success: true, message: "Access revoked." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
