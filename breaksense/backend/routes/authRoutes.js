const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

// SIGN UP ROUTE
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body; 
        
        // --- STRONG PASSWORD VALIDATION ---
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
        // ----------------------------------

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword]
        );

        res.json({ success: true, message: "User registered" });
    } catch (err) {
        console.error("SIGNUP ERROR:", err.message); 
        res.status(500).json({ success: false, message: err.message }); 
    }
});

// LOG IN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// UPDATE PROFILE ROUTE
router.put('/update-profile', async (req, res) => {
    try {
        const { userId, firstName, lastName } = req.body;

        await pool.query(
            'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
            [firstName, lastName, userId]
        );

        res.json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// RESET ACCOUNT ROUTE
router.delete('/reset-account/:userId', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { userId } = req.params;
        await connection.beginTransaction();

        // 1. Delete all history from breaks_history
        await connection.query('DELETE FROM breaks_history WHERE user_id = ?', [userId]);

        // 2. Reset study statistics in the users table
        await connection.query(`
            UPDATE users
            SET SessionsToday = 0,
                TotalStudyTimeToday = 0,
                DayStreak = 0,
                LastStudyDate = NULL
            WHERE id = ?
        `, [userId]);

        await connection.commit();
        res.json({ success: true, message: "Account data cleared successfully." });
    } catch (err) {
        await connection.rollback();
        console.error("Reset Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
