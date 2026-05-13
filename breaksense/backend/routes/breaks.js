const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

// GET BREAK HISTORY
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const [rows] = await pool.query(
            'SELECT * FROM breaks_history WHERE user_id = ? ORDER BY createdAt DESC',
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE HISTORY
router.delete('/history', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId || req.body.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const [result] = await pool.query('DELETE FROM breaks_history WHERE user_id = ?', [userId]);
        res.json({
            success: true,
            message: 'History cleared successfully',
            rowsDeleted: result.affectedRows
        });
    } catch (err) {
        console.error("[DELETE] Critical Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// SAVE A BREAK
router.post('/save', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            break_type, category, duration_taken,
            fatigue_before, stress_before, rating,
            user_id, userId, session_number
        } = req.body;
        const uId = user_id || userId;

        if (!uId || !break_type || !category) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        await connection.beginTransaction();
        await connection.query(`
            INSERT INTO breaks_history (user_id, break_type, category, duration_taken, fatigue_before, stress_before, rating, session_number, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [parseInt(uId), break_type, category, duration_taken, fatigue_before, stress_before, rating, session_number]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Break saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error("Error saving break:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// LOG STUDY SESSION
router.post('/log-study', async (req, res) => {
    try {
        const { user_id, userId, study_duration } = req.body;
        const uId = user_id || userId;
        if (!uId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const studyTimeToAdd = parseInt(study_duration, 10) || 0;
        await pool.query(`
            UPDATE users
            SET SessionsToday = IFNULL(SessionsToday, 0) + 1,
                TotalStudyTimeToday = IFNULL(TotalStudyTimeToday, 0) + ?,
                LastStudyDate = NOW()
            WHERE id = ?
        `, [studyTimeToAdd, uId]);

        res.status(200).json({ success: true, message: 'Study session logged successfully' });
    } catch (error) {
        console.error("Error logging study:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET STATS
router.get('/stats', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });
        const uId = parseInt(userId);

        const [statsRows] = await pool.query(`
            SELECT
                SUM(CASE WHEN category != 'Focus Time' THEN 1 ELSE 0 END) as totalBreaks,
                IFNULL(AVG(CASE WHEN category != 'Focus Time' THEN rating END), 0) as avgScore,
                IFNULL(MAX(CASE WHEN category != 'Focus Time' THEN rating END), 0) as bestScore,
                SUM(CASE WHEN category LIKE '%PHYSICAL%' OR category LIKE '%MOVE%' THEN 1 ELSE 0 END) as countPhysical,
                SUM(CASE WHEN category LIKE '%MIND%' THEN 1 ELSE 0 END) as countMind,
                SUM(CASE WHEN category LIKE '%NUTRITION%' THEN 1 ELSE 0 END) as countNutrition,
                SUM(CASE WHEN category LIKE '%REST%' THEN 1 ELSE 0 END) as countRest
            FROM breaks_history
            WHERE user_id = ?
        `, [uId]);

        const [topCatRows] = await pool.query(`
            SELECT category FROM breaks_history
            WHERE user_id = ? AND category != 'Focus Time'
            GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1
        `, [uId]);

        const [userRows] = await pool.query('SELECT SessionsToday, TotalStudyTimeToday, DayStreak FROM users WHERE id = ?', [uId]);

        const data = statsRows[0] || {};
        const user = userRows[0] || {};
        const topCat = topCatRows[0] || { category: 'None' };

        res.json({
            totalBreaks: parseInt(data.totalBreaks),
            avgScore: parseFloat(data.avgScore),
            bestScore: parseInt(data.bestScore),
            topCategory: topCat.category,
            SessionsToday: parseInt(user.SessionsToday || 0),
            TotalStudyTimeToday: parseInt(user.TotalStudyTimeToday || 0),
            DayStreak: parseInt(user.DayStreak || 0),
            categoryCounts: {
                'Physical Movement': parseInt(data.countPhysical),
                'Mindfulness': parseInt(data.countMind),
                'Nutrition': parseInt(data.countNutrition),
                'Rest & Recovery': parseInt(data.countRest)
            }
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET ML RECOMMENDATION
router.post('/recommend', async (req, res) => {
    try {
        const { fatigue, stress, time } = req.body;
        const mood = 6 - (parseInt(fatigue) || 3);
        const stressLevel = parseInt(stress) || 1;
        const workHours = (parseInt(time) || 30) / 60;

        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            mood, stress: stressLevel, work_duration: workHours
        });
        res.json(mlResponse.data);
    } catch (error) {
        res.json({ break_type: 'eye_rest', duration_minutes: 5, is_fallback: true });
    }
});

module.exports = router;
