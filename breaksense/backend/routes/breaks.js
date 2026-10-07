const express = require('express');
const router = express.Router();
const Break = require('../models/Break');
const User = require('../models/User');
const axios = require('axios');

// --- HISTORY ---
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const history = await Break.find({ user_id: userId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- SAVE BREAK ---
router.post('/save', async (req, res) => {
    try {
        const { break_type, category, duration_taken, fatigue_before, stress_before, rating, user_id, session_number } = req.body;
        const newBreak = new Break({
            user_id, break_type, category, duration_taken, fatigue_before, stress_before, rating, session_number
        });
        await newBreak.save();
        res.status(200).json({ success: true, message: 'Break saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- LOG STUDY SESSION ---
router.post('/log-study', async (req, res) => {
    try {
        const { user_id, study_duration, clientDate } = req.body;
        const todayStr = clientDate || new Date().toISOString().split('T')[0];

        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const lastDate = user.LastStudyDate ? user.LastStudyDate.toISOString().split('T')[0] : null;
        if (lastDate === todayStr) {
            user.SessionsToday += 1;
            user.TotalStudyTimeToday += parseInt(study_duration);
        } else {
            user.SessionsToday = 1;
            user.TotalStudyTimeToday = parseInt(study_duration);
        }
        user.LastStudyDate = new Date();
        await user.save();

        const focusBreak = new Break({
            user_id, break_type: 'Study Session', category: 'Focus Time', duration_taken: study_duration, rating: 5
        });
        await focusBreak.save();

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- STATS ---
router.get('/stats', async (req, res) => {
    try {
        const { user_id, date } = req.query;
        const dateToCompare = date || new Date().toISOString().split('T')[0];

        const user = await User.findById(user_id);
        const history = await Break.find({ user_id });

        let stats = {
            totalBreaks: 0, totalRating: 0, bestScore: 0, SessionsToday: 0, TotalStudyTimeToday: 0,
            counts: { 'Physical Movement': 0, 'Mindfulness': 0, 'Nutrition': 0, 'Rest & Recovery': 0 },
            freq: {}
        };

        history.forEach(b => {
            const cat = (b.category || '').toLowerCase();
            const bDate = b.createdAt.toISOString().split('T')[0];

            if (cat === 'focus time') {
                if (bDate === dateToCompare) {
                    stats.SessionsToday++;
                    stats.TotalStudyTimeToday += b.duration_taken;
                }
            } else {
                stats.totalBreaks++;
                stats.totalRating += b.rating;
                if (b.rating > stats.bestScore) stats.bestScore = b.rating;

                if (cat.includes('physical') || cat.includes('move')) stats.counts['Physical Movement']++;
                else if (cat.includes('mind')) stats.counts['Mindfulness']++;
                else if (cat.includes('nutrition')) stats.counts['Nutrition']++;
                else if (cat.includes('rest')) stats.counts['Rest & Recovery']++;

                stats.freq[b.category] = (stats.freq[b.category] || 0) + 1;
            }
        });

        let topCat = Object.entries(stats.freq).sort((a,b) => b[1] - a[1])[0]?.[0] || 'None';
        const avgScoreVal = stats.totalBreaks > 0 ? stats.totalRating / stats.totalBreaks : 0;

        // Evidence-Based Actionable Advice Generator
        let actionableAdvice = "";
        let researchCitation = "";

        if (stats.totalBreaks === 0) {
            actionableAdvice = "No recovery breaks recorded yet. According to Ariga & Lleras (2011, Cognition), continuous study without micro-breaks causes rapid vigilance decrement. Advise student to schedule a 5-minute break every 25-30 minutes.";
            researchCitation = "Ariga & Lleras (2011), Cognition";
        } else if (avgScoreVal < 3.0) {
            actionableAdvice = `Average refresh score is sub-optimal (${avgScoreVal.toFixed(1)}/5.0). Marcora et al. (2009, J. Appl. Physiol.) proved cognitive fatigue increases perceived task difficulty and error rates. Recommend switching from passive rest to 5-minute active physical movement micro-breaks to re-stimulate dopamine.`;
            researchCitation = "Marcora et al. (2009), Journal of Applied Physiology";
        } else if (topCat.toLowerCase().includes('physical') || topCat.toLowerCase().includes('move')) {
            actionableAdvice = `Student relies primarily on Physical Movement (${stats.counts['Physical Movement']} breaks). Research by Korpela et al. (2014, J. Env. Psychol.) shows active movement breaks restore executive function and reduce mental fatigue by up to 34%. Counsel student to maintain active walks between heavy study blocks.`;
            researchCitation = "Korpela et al. (2014), Journal of Environmental Psychology";
        } else if (topCat.toLowerCase().includes('mind')) {
            actionableAdvice = `Student favors Mindfulness techniques (${stats.counts['Mindfulness']} breaks). Mrazek et al. (2013, Psychol. Sci.) demonstrated that 2-minute breath mindfulness breaks reduce Default Mode Network rumination and improve working memory capacity by 16%.`;
            researchCitation = "Mrazek et al. (2013), Psychological Science";
        } else if (topCat.toLowerCase().includes('nutrition')) {
            actionableAdvice = `Student's top recovery category is Nutrition & Hydration. Benton et al. (2011, Appetite) showed that even 1.5% mild dehydration impairs working memory and processing speed. Advise pairing hydration with brief light stretching.`;
            researchCitation = "Benton et al. (2011), Appetite";
        } else {
            actionableAdvice = `Student relies on Rest & Recovery (${stats.counts['Rest & Recovery']} breaks). Ariga & Lleras (2011, Cognition) proved brief goal-deactivation breaks eliminate attentional fatigue. Suggest pairing passive rest with visual disengagement (the 20-20-20 eye-rest rule) to maximize alertness.`;
            researchCitation = "Ariga & Lleras (2011), Cognition";
        }

        res.json({
            success: true,
            totalBreaks: stats.totalBreaks,
            avgScore: avgScoreVal,
            bestScore: stats.bestScore,
            topCategory: topCat,
            SessionsToday: stats.SessionsToday,
            TotalStudyTimeToday: stats.TotalStudyTimeToday,
            DayStreak: user ? user.DayStreak : 0,
            categoryCounts: stats.counts,
            actionableAdvice,
            researchCitation
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- RECOMMEND ---
router.post('/recommend', async (req, res) => {
    try {
        const { fatigue, stress, time } = req.body;
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
            mood: 6 - fatigue, stress, work_duration: time / 60
        }, { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        res.json({ break_type: 'eye_rest', duration_minutes: 5, is_fallback: true });
    }
});

module.exports = router;
