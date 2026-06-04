const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

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

router.post('/log-study', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { user_id, userId, study_duration, clientDate } = req.body;
        const uId = user_id || userId;
        if (!uId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const studyTimeToAdd = parseInt(study_duration, 10) || 0;
        const dateToCompare = clientDate ? `'${clientDate}'` : 'DATE(NOW())';

        await connection.beginTransaction();

        // 1. Update user aggregate stats
        await connection.query(`
            UPDATE users
            SET
                SessionsToday = IF(DATE(LastStudyDate) = ${dateToCompare}, IFNULL(SessionsToday, 0) + 1, 1),
                TotalStudyTimeToday = IF(DATE(LastStudyDate) = ${dateToCompare}, IFNULL(TotalStudyTimeToday, 0) + ?, ?),
                LastStudyDate = NOW()
            WHERE id = ?
        `, [studyTimeToAdd, studyTimeToAdd, uId]);

        // 2. Insert into breaks_history as "Focus Time"
        await connection.query(`
            INSERT INTO breaks_history (user_id, break_type, category, duration_taken, fatigue_before, stress_before, rating, session_number, createdAt)
            VALUES (?, 'Study Session', 'Focus Time', ?, 1, 1, 5, 0, NOW())
        `, [uId, studyTimeToAdd]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Study session logged successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("CRITICAL LOG-STUDY ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/stats', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId;
        const clientDate = req.query.date;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        // Use raw userId to match /history behavior
        const uId = userId;
        const dateToCompare = clientDate ? `'${clientDate}'` : 'DATE(NOW())';

        const [statsRows] = await pool.query(`
            SELECT
                SUM(CASE WHEN TRIM(LOWER(category)) != 'focus time' THEN 1 ELSE 0 END) as totalBreaks,
                IFNULL(AVG(CASE WHEN TRIM(LOWER(category)) != 'focus time' THEN rating END), 0) as avgScore,
                IFNULL(MAX(CASE WHEN TRIM(LOWER(category)) != 'focus time' THEN rating END), 0) as bestScore,
                SUM(CASE WHEN TRIM(LOWER(category)) LIKE '%physical%' OR TRIM(LOWER(category)) LIKE '%move%' THEN 1 ELSE 0 END) as countPhysical,
                SUM(CASE WHEN TRIM(LOWER(category)) LIKE '%mind%' THEN 1 ELSE 0 END) as countMind,
                SUM(CASE WHEN TRIM(LOWER(category)) LIKE '%nutrition%' THEN 1 ELSE 0 END) as countNutrition,
                SUM(CASE WHEN TRIM(LOWER(category)) LIKE '%rest%' THEN 1 ELSE 0 END) as countRest,

                SUM(CASE WHEN TRIM(LOWER(category)) = 'focus time' AND DATE(createdAt) = ${dateToCompare} THEN 1 ELSE 0 END) as SessionsToday,
                SUM(CASE WHEN TRIM(LOWER(category)) = 'focus time' AND DATE(createdAt) = ${dateToCompare} THEN duration_taken ELSE 0 END) as TotalStudyTimeToday
            FROM breaks_history
            WHERE user_id = ?
        `, [uId]);

        const [topCatRows] = await pool.query(`
            SELECT category FROM breaks_history
            WHERE user_id = ? AND TRIM(LOWER(category)) != 'focus time'
            GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1
        `, [uId]);

        const [userRows] = await pool.query(`
            SELECT DayStreak, pomodoro_duration, sessions_per_cycle
            FROM users
            WHERE id = ?
        `, [uId]);

        const data = statsRows[0] || {};
        const user = userRows[0] || {};
        const topCat = topCatRows[0] || { category: 'None' };

        res.json({
            success: true,
            totalBreaks: parseInt(data.totalBreaks) || 0,
            avgScore: parseFloat(data.avgScore) || 0,
            bestScore: parseInt(data.bestScore) || 0,
            topCategory: topCat.category,
            SessionsToday: parseInt(data.SessionsToday) || 0,
            TotalStudyTimeToday: parseInt(data.TotalStudyTimeToday) || 0,
            DayStreak: parseInt(user.DayStreak || 0),
            pomodoro_duration: user.pomodoro_duration || '25 min',
            sessions_per_cycle: user.sessions_per_cycle || 4,
            categoryCounts: {
                'Physical Movement': parseInt(data.countPhysical) || 0,
                'Mindfulness': parseInt(data.countMind) || 0,
                'Nutrition': parseInt(data.countNutrition) || 0,
                'Rest & Recovery': parseInt(data.countRest) || 0
            }
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

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
