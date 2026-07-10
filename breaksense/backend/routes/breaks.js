const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

// --- HISTORY ---
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const snapshot = await db.collection('breaks_history')
            .where('user_id', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const history = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            history.push({
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to JS Date string for frontend compatibility
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
            });
        });

        res.json(history);
    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CLEAR HISTORY ---
router.delete('/history', async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId || req.body.user_id;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const snapshot = await db.collection('breaks_history').where('user_id', '==', userId).get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        res.json({ success: true, message: 'History cleared successfully' });
    } catch (err) {
        console.error("[DELETE] Critical Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- SAVE BREAK ---
router.post('/save', async (req, res) => {
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

        await db.collection('breaks_history').add({
            user_id: uId,
            break_type,
            category,
            duration_taken: parseInt(duration_taken) || 0,
            fatigue_before: parseInt(fatigue_before) || 1,
            stress_before: parseInt(stress_before) || 1,
            rating: parseInt(rating) || 5,
            session_number: parseInt(session_number) || 0,
            createdAt: new Date()
        });

        res.status(200).json({ success: true, message: 'Break saved successfully' });
    } catch (error) {
        console.error("Error saving break:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- LOG STUDY SESSION ---
router.post('/log-study', async (req, res) => {
    try {
        const { user_id, userId, study_duration, clientDate } = req.body;
        const uId = user_id || userId;
        if (!uId) return res.status(400).json({ success: false, error: 'User ID is required' });

        const studyTimeToAdd = parseInt(study_duration, 10) || 0;
        const todayStr = clientDate || new Date().toISOString().split('T')[0];

        const userRef = db.collection('users').doc(uId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const userData = userDoc.data();

        const lastStudyDate = userData.LastStudyDate ? userData.LastStudyDate.toDate().toISOString().split('T')[0] : null;

        let newSessionsToday = (lastStudyDate === todayStr) ? (userData.SessionsToday || 0) + 1 : 1;
        let newTotalStudyTime = (lastStudyDate === todayStr) ? (userData.TotalStudyTimeToday || 0) + studyTimeToAdd : studyTimeToAdd;

        // Update User Doc
        await userRef.update({
            SessionsToday: newSessionsToday,
            TotalStudyTimeToday: newTotalStudyTime,
            LastStudyDate: new Date()
        });

        // Add to history
        await db.collection('breaks_history').add({
            user_id: uId,
            break_type: 'Study Session',
            category: 'Focus Time',
            duration_taken: studyTimeToAdd,
            fatigue_before: 1,
            stress_before: 1,
            rating: 5,
            session_number: 0,
            createdAt: new Date()
        });

        res.status(200).json({ success: true, message: 'Study session logged successfully' });
    } catch (error) {
        console.error("CRITICAL LOG-STUDY ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- STATS (DASHBOARD) ---
router.get('/stats', async (req, res) => {
    try {
        const userId = (req.query.user_id || req.query.userId || '').trim();
        const clientDate = (req.query.date || '').trim();
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        const dateToCompare = clientDate || new Date().toISOString().split('T')[0];

        // Fetch user doc for streak
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || { DayStreak: 0 };

        // Fetch ALL history for this user (for aggregation)
        // Note: For large datasets, this should be done with aggregate queries or daily total docs
        const historySnapshot = await db.collection('breaks_history').where('user_id', '==', userId).get();

        let totalBreaks = 0;
        let totalRating = 0;
        let bestScore = 0;
        let SessionsToday = 0;
        let TotalStudyTimeToday = 0;
        const counts = {
            'Physical Movement': 0,
            'Mindfulness': 0,
            'Nutrition': 0,
            'Rest & Recovery': 0
        };
        const categoryFreq = {};

        historySnapshot.forEach(doc => {
            const data = doc.data();
            const catNormalized = (data.category || '').trim().toLowerCase();
            const createdAtStr = data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : '';

            if (catNormalized === 'focus time') {
                if (createdAtStr === dateToCompare) {
                    SessionsToday++;
                    TotalStudyTimeToday += (data.duration_taken || 0);
                }
            } else {
                totalBreaks++;
                totalRating += (data.rating || 0);
                if ((data.rating || 0) > bestScore) bestScore = data.rating;

                // Category counts for bars
                if (catNormalized.includes('physical') || catNormalized.includes('move')) counts['Physical Movement']++;
                else if (catNormalized.includes('mind')) counts['Mindfulness']++;
                else if (catNormalized.includes('nutrition')) counts['Nutrition']++;
                else if (catNormalized.includes('rest')) counts['Rest & Recovery']++;

                // For Top Category
                const catRaw = data.category || 'Unknown';
                categoryFreq[catRaw] = (categoryFreq[catRaw] || 0) + 1;
            }
        });

        // Determine top category
        let topCategory = 'None';
        let maxFreq = 0;
        Object.entries(categoryFreq).forEach(([cat, freq]) => {
            if (freq > maxFreq) {
                maxFreq = freq;
                topCategory = cat;
            }
        });

        res.json({
            success: true,
            totalBreaks,
            avgScore: totalBreaks > 0 ? (totalRating / totalBreaks) : 0,
            bestScore,
            topCategory,
            SessionsToday,
            TotalStudyTimeToday,
            DayStreak: userData.DayStreak || 0,
            pomodoro_duration: '25 min',
            sessions_per_cycle: 4,
            categoryCounts: counts
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- RECOMMENDATION (KNN) ---
router.post('/recommend', async (req, res) => {
    try {
        const { fatigue, stress, time } = req.body;
        const mood = 6 - (parseInt(fatigue) || 3);
        const stressLevel = parseInt(stress) || 1;
        const workHours = (parseInt(time) || 30) / 60;

        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            mood, stress: stressLevel, work_duration: workHours
        }, { timeout: 3000 });

        res.json(mlResponse.data);
    } catch (error) {
        console.log("ML Service Timeout or Error - Using fallback recommendation");
        res.json({ break_type: 'eye_rest', duration_minutes: 5, is_fallback: true });
    }
});

module.exports = router;
