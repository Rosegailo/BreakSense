const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body; 

        // Password validation
        const minLength = 8;
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasUpper = /[A-Z]/.test(password);

        if (password.length < minLength || !hasNumber || !hasSpecial || !hasUpper) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character."
            });
        }

        // Check if user already exists
        const userRef = db.collection('users');
        const existingUser = await userRef.where('email', '==', email).get();
        if (!existingUser.empty) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user document
        const newUserRef = await userRef.add({
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: hashedPassword,
            SessionsToday: 0,
            TotalStudyTimeToday: 0,
            DayStreak: 0,
            LastStudyDate: null,
            createdAt: new Date()
        });

        res.json({ success: true, message: "User registered", userId: newUserRef.id });
    } catch (err) {
        console.error("SIGNUP ERROR:", err.message); 
        res.status(500).json({ success: false, message: err.message }); 
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userSnapshot = await db.collection('users').where('email', '==', email).get();

        if (userSnapshot.empty) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        res.json({ 
            success: true, 
            user: {
                id: userDoc.id, // Return Firestore document ID as the User ID
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                pomodoro_duration: '25 min',
                sessions_per_cycle: 4
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- UPDATE PROFILE ---
router.put('/update-profile', async (req, res) => {
    try {
        const { userId, firstName, lastName } = req.body;

        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

        await db.collection('users').doc(userId).update({
            first_name: firstName,
            last_name: lastName
        });

        res.json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- RESET ACCOUNT ---
router.delete('/reset-account/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Delete all logs in breaks_history for this user
        const batch = db.batch();
        const historySnapshot = await db.collection('breaks_history').where('user_id', '==', userId).get();

        historySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 2. Reset user stats
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            SessionsToday: 0,
            TotalStudyTimeToday: 0,
            DayStreak: 0,
            LastStudyDate: null
        });

        await batch.commit();
        res.json({ success: true, message: "Account data cleared successfully." });
    } catch (err) {
        console.error("Reset Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
