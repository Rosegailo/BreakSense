const express = require('express');
const router = express.Router();
const sql = require('mssql');
const axios = require('axios');
const { poolPromise } = require('../db'); // Uses your db.js connection

// SAVE A COMPLETED BREAK
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id; // Retrieve user_id from query
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT * FROM breaks_history WHERE user_id = @UserId ORDER BY createdAt DESC');

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE ALL BREAK HISTORY FOR A USER
router.delete('/history', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId || req.body.user_id;
        console.log(`[DELETE] Starting clear for user: ${userId}`);

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('TargetId', sql.Int, parseInt(userId, 10))
            .query('DELETE FROM breaks_history WHERE user_id = @TargetId');

        console.log(`[DELETE] Rows affected: ${result.rowsAffected[0]}`);

        res.json({
            success: true,
            message: 'History cleared successfully',
            rowsDeleted: result.rowsAffected[0]
        });
    } catch (err) {
        console.error("[DELETE] Critical Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// SAVE A COMPLETED BREAK
// SAVE A COMPLETED BREAK
router.post('/save', async (req, res) => {
    try {
        // Extract from body, falling back to query parameters if necessary
        const { break_type, category, duration_taken, fatigue_before, stress_before, rating, user_id, userId, study_duration, session_number } = req.body;
        
        const uId = user_id || userId || req.query.user_id || req.query.userId;

        if (!uId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }
        
        // Ensure that non-nullable string fields are not empty
        if (!break_type || !category) {
            return res.status(400).json({ success: false, error: 'Break type and category are required' });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        try {
            // 1. Insert into breaks_history
            // NOTE: session_number was removed as it is not in the database schema
            await transaction.request()
                .input('UserId', sql.Int, parseInt(uId, 10) || uId)
                .input('BreakType', sql.NVarChar, break_type)
                .input('Category', sql.NVarChar, category)
                .input('DurationTaken', sql.Int, duration_taken)
                .input('FatigueBefore', sql.Int, fatigue_before)
                .input('StressBefore', sql.Int, stress_before)
                .input('Rating', sql.Int, rating)
                .query(`
                    INSERT INTO breaks_history (
                        user_id,
                        break_type,
                        category,
                        duration_taken,
                        fatigue_before,
                        stress_before,
                        rating,
                        createdAt
                    )
                    VALUES (
                        @UserId,
                        @BreakType,
                        @Category,
                        @DurationTaken,
                        @FatigueBefore,
                        @StressBefore,
                        @Rating,
                        GETDATE()
                    )
                `);

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Break saved successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error("Error saving break:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// LOG JUST THE STUDY SESSION (WITHOUT A BREAK)
router.post('/log-study', async (req, res) => {
    try {
        const { user_id, userId, study_duration } = req.body;
        const uId = user_id || userId;

        if (!uId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const pool = await poolPromise;
        const studyTimeToAdd = parseInt(study_duration, 10) || 0;

        await pool.request()
            .input('UserId', sql.Int, parseInt(uId, 10))
            .input('StudyTime', sql.Int, studyTimeToAdd)
            .query(`
                UPDATE users
                SET SessionsToday = ISNULL(SessionsToday, 0) + 1,
                    TotalStudyTimeToday = ISNULL(TotalStudyTimeToday, 0) + @StudyTime,
                    LastStudyDate = GETDATE()
                WHERE id = @UserId
            `);

        res.status(200).json({ success: true, message: 'Study session logged successfully' });
    } catch (error) {
        console.error("Error logging study session:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET ANALYTICS FOR HOME SCREEN
router.get('/stats', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        const pool = await poolPromise;
        const uId = parseInt(userId, 10);

        // 1. Get unified stats and category counts in one efficient query
        const statsRes = await pool.request()
            .input('UId', sql.Int, uId)
            .query(`
                SELECT 
                    COUNT(*) as totalBreaks,
                    ISNULL(AVG(CAST(rating AS FLOAT)), 0) as avgScore,
                    ISNULL(MAX(rating), 0) as bestScore,
                    (SELECT TOP 1 category FROM breaks_history WHERE user_id = @UId GROUP BY category ORDER BY COUNT(*) DESC) as topCategory,
                    SUM(CASE WHEN category LIKE '%PHYSICAL%' OR category LIKE '%MOVE%' THEN 1 ELSE 0 END) as countPhysical,
                    SUM(CASE WHEN category LIKE '%MIND%' THEN 1 ELSE 0 END) as countMind,
                    SUM(CASE WHEN category LIKE '%NUTRITION%' THEN 1 ELSE 0 END) as countNutrition,
                    SUM(CASE WHEN category LIKE '%REST%' THEN 1 ELSE 0 END) as countRest
                FROM breaks_history
                WHERE user_id = @UId
            `);

        // 2. Get user progress from users table
        const userRes = await pool.request()
            .input('UId', sql.Int, uId)
            .query('SELECT SessionsToday, TotalStudyTimeToday, DayStreak FROM users WHERE id = @UId');

        const data = statsRes.recordset[0] || {};
        const user = userRes.recordset[0] || {};

        const categoryCounts = {
            'Physical Movement': parseInt(data.countPhysical || 0, 10),
            'Mindfulness': parseInt(data.countMind || 0, 10),
            'Nutrition': parseInt(data.countNutrition || 0, 10),
            'Rest & Recovery': parseInt(data.countRest || 0, 10)
        };

        res.json({
            totalBreaks: parseInt(data.totalBreaks || 0, 10),
            avgScore: parseFloat(data.avgScore || 0),
            bestScore: parseInt(data.bestScore || 0, 10),
            topCategory: data.topCategory || 'None',
            SessionsToday: parseInt(user.SessionsToday || 0, 10),
            TotalStudyTimeToday: parseInt(user.TotalStudyTimeToday || 0, 10),
            DayStreak: parseInt(user.DayStreak || 0, 10),
            categoryCounts
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET CATEGORY STATS FOR HOME SCREEN
router.get('/category-stats', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT category, COUNT(*) as count
                FROM breaks_history
                WHERE user_id = @UserId
                GROUP BY category
            `);

        // Initialize with zeros to ensure all categories show up in the chart
        const counts = {
            'Physical Movement': 0,
            'Mindfulness': 0,
            'Nutrition': 0,
            'Rest & Recovery': 0
        };

        // Map database results to the standard category names used in the UI
        result.recordset.forEach(row => {
            const cat = row.category.toUpperCase();
            if (cat.includes('PHYSICAL') || cat.includes('MOVE')) counts['Physical Movement'] = row.count;
            else if (cat.includes('MIND')) counts['Mindfulness'] = row.count;
            else if (cat.includes('NUTRITION')) counts['Nutrition'] = row.count;
            else if (cat.includes('REST')) counts['Rest & Recovery'] = row.count;
        });

        res.json(counts);
    } catch (err) {
        console.error("Category Stats Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET ML RECOMMENDATION
router.post('/recommend', async (req, res) => {
    try {
        const { fatigue, stress, time } = req.body;

        // Map Mobile data to ML Service expectations:
        // 1. Mood: (ML 1 is bad, 5 is good) | (Mobile Fatigue 1 is good, 5 is bad)
        const mood = 6 - (parseInt(fatigue) || 3);
        
        // 2. Stress: Both use 1-3 scale usually
        const stressLevel = parseInt(stress) || 1;

        // 3. Work Duration: ML expects hours, Mobile sends minutes
        const workHours = (parseInt(time) || 30) / 60;

        console.log(`Requesting ML Prediction: mood=${mood}, stress=${stressLevel}, hours=${workHours}`);

        // Call the Flask ML Service
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            mood: mood,
            stress: stressLevel,
            work_duration: workHours
        });

        res.json(mlResponse.data);
    } catch (error) {
        console.error("ML Service Error:", error.message);
        // Fallback if ML service is down
        res.json({
            break_type: 'eye_rest',
            duration_minutes: 5,
            reason: 'Fallback: Eye rest recommended.',
            is_fallback: true
        });
    }
});

module.exports = router;