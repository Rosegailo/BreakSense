const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// 1. IMPORT poolPromise and sql from your db.js file
const { sql, poolPromise } = require('../db'); 

// SIGN UP ROUTE
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body; 
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. WAIT FOR THE POOL instead of calling sql.connect()
        const pool = await poolPromise; 
        await pool.request()
            .input('firstName', sql.NVarChar, firstName)
            .input('lastName', sql.NVarChar, lastName)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO users (first_name, last_name, email, password) VALUES (@firstName, @lastName, @email, @password)');

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

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email');

        const user = result.recordset[0];

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
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// UPDATE PROFILE ROUTE
router.put('/update-profile', async (req, res) => {
    try {
        const { userId, firstName, lastName } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('firstName', sql.NVarChar, firstName)
            .input('lastName', sql.NVarChar, lastName)
            .query('UPDATE users SET first_name = @firstName, last_name = @lastName WHERE id = @userId');

        res.json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// RESET ACCOUNT ROUTE
router.delete('/reset-account/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await poolPromise;

        // Start a transaction to ensure both deletions happen together
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Delete all history from breaks_history (using correct table and column name)
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM breaks_history WHERE user_id = @userId');

            // 2. Reset study statistics in the users table
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE users
                    SET SessionsToday = 0,
                        TotalStudyTimeToday = 0,
                        DayStreak = 0,
                        LastStudyDate = NULL
                    WHERE id = @userId
                `);

            await transaction.commit();
            res.json({ success: true, message: "Account data cleared successfully." });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Reset Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;