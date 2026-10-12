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

        // Reset analytics access status after ending a study session
        // so the counselor can request access again for the new session
        user.analyticsAccessStatus = 'none';
        user.dataSharingPermission = 'none';
        user.permissionExpiry = null;

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
        if (!user_id) return res.status(400).json({ success: false, error: 'user_id parameter required' });

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
            const bDate = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '';

            if (cat === 'focus time' || cat === 'study session') {
                if (bDate === dateToCompare) {
                    stats.SessionsToday++;
                    stats.TotalStudyTimeToday += (b.duration_taken || 0);
                }
            } else {
                stats.totalBreaks++;
                stats.totalRating += (b.rating || 5);
                if ((b.rating || 5) > stats.bestScore) stats.bestScore = (b.rating || 5);

                if (cat.includes('physical') || cat.includes('move') || cat.includes('stretch') || cat.includes('walk')) {
                    stats.counts['Physical Movement']++;
                } else if (cat.includes('mind') || cat.includes('breath') || cat.includes('meditat') || cat.includes('journal')) {
                    stats.counts['Mindfulness']++;
                } else if (cat.includes('nutrition') || cat.includes('water') || cat.includes('tea') || cat.includes('snack') || cat.includes('food') || cat.includes('hydrat')) {
                    stats.counts['Nutrition']++;
                } else {
                    stats.counts['Rest & Recovery']++;
                }

                const cleanCatName = b.category || 'Rest & Recovery';
                stats.freq[cleanCatName] = (stats.freq[cleanCatName] || 0) + 1;
            }
        });

        let topCat = Object.entries(stats.freq).sort((a,b) => b[1] - a[1])[0]?.[0] || 'None';
        const avgScoreVal = stats.totalBreaks > 0 ? stats.totalRating / stats.totalBreaks : 0;

        // Evidence-Based Actionable Advice Generator (Scientifically Audited Citations)
        let actionableAdvice = "";
        let researchCitation = "";

        if (stats.totalBreaks === 0) {
            actionableAdvice = "No recovery breaks recorded yet. Research by Ariga & Lleras (2011, Cognition) demonstrates that brief goal-deactivation micro-breaks maintain sustained focus and prevent vigilance decrement during study sessions. Advise student to schedule brief micro-breaks every 25-30 minutes.";
            researchCitation = "Ariga & Lleras (2011), Cognition";
        } else if (avgScoreVal < 3.0) {
            actionableAdvice = `Average refresh score is sub-optimal (${avgScoreVal.toFixed(1)}/5.0). Marcora et al. (2009, J. Appl. Physiol.) established that mental fatigue significantly increases perceived exertion and task difficulty. Recommend switching to active physical movement micro-breaks to reduce perceived effort and restore vigor.`;
            researchCitation = "Marcora et al. (2009), Journal of Applied Physiology";
        } else if (topCat.toLowerCase().includes('physical') || topCat.toLowerCase().includes('move')) {
            actionableAdvice = `Student relies primarily on Physical Movement (${stats.counts['Physical Movement']} breaks). Research by de Bloom, Sianoja, & Korpela et al. (2017, J. Environ. Psychol.) demonstrates that active walking micro-breaks significantly enhance psychological restoration and reduce mental strain. Counsel student to maintain light active walks between heavy study blocks.`;
            researchCitation = "de Bloom, Sianoja, & Korpela et al. (2017), Journal of Environmental Psychology";
        } else if (topCat.toLowerCase().includes('mind')) {
            actionableAdvice = `Student favors Mindfulness techniques (${stats.counts['Mindfulness']} breaks). Research by Sianoja et al. (2018, J. Occup. Health Psychol.) shows that brief mindful relaxation micro-breaks effectively alleviate mental strain and significantly improve concentration during cognitive work.`;
            researchCitation = "Sianoja et al. (2018), Journal of Occupational Health Psychology";
        } else if (topCat.toLowerCase().includes('nutrition')) {
            actionableAdvice = `Student's top recovery category is Nutrition & Hydration. Research by Ganio et al. (2011, Br. J. Nutr.) & Armstrong et al. (2012, J. Nutr.) demonstrated that mild dehydration (~1.5% fluid loss) increases vigilance errors, degrades visual memory, and heightens subjective task fatigue. Advise pairing hydration with brief stretching.`;
            researchCitation = "Ganio et al. (2011), British Journal of Nutrition & Armstrong et al. (2012)";
        } else {
            actionableAdvice = `Student relies on Rest & Recovery (${stats.counts['Rest & Recovery']} breaks). Research by Ariga & Lleras (2011, Cognition) proves that brief goal-deactivation micro-breaks eliminate attentional fatigue. Suggest pairing passive rest with visual disengagement (the 20-20-20 eye-rest rule) to maximize alertness.`;
            researchCitation = "Ariga & Lleras (2011), Cognition";
        }

        const sessionsTodayCount = user && user.SessionsToday !== undefined ? user.SessionsToday : stats.SessionsToday;

        res.json({
            success: true,
            totalBreaks: stats.totalBreaks,
            avgScore: avgScoreVal,
            bestScore: stats.bestScore,
            topCategory: topCat,
            SessionsToday: sessionsTodayCount,
            TotalStudyTimeToday: user && user.TotalStudyTimeToday !== undefined ? user.TotalStudyTimeToday : stats.TotalStudyTimeToday,
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
        const fatVal = parseInt(fatigue) || 3;
        const strVal = parseInt(stress) || 2;
        const timeVal = parseInt(time) || 10;

        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        try {
            const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
                mood: Math.max(1, Math.min(5, 6 - fatVal)),
                stress: strVal,
                work_duration: timeVal / 60
            }, { timeout: 3000 });

            if (response.data && response.data.break_type) {
                return res.json(response.data);
            }
        } catch (mlError) {
            console.log("ML Microservice offline/unreachable. Using dynamic AI rule fallback.");
        }

        // --- Dynamic AI Fallback Engine ---
        // Generates varied, tailored recommendations based on fatigue, stress, and break duration
        let breakType = 'Eye Rest 20-20-20';
        let durationMin = timeVal;

        if (fatVal >= 4 && timeVal >= 15) {
            breakType = 'Power Nap';
            durationMin = 20;
        } else if (strVal >= 3 && fatVal >= 3) {
            breakType = 'Box Breathing';
            durationMin = 5;
        } else if (fatVal >= 4) {
            breakType = 'Neck & Shoulder Stretch';
            durationMin = 5;
        } else if (strVal >= 3) {
            breakType = '5-4-3-2-1 Grounding';
            durationMin = 5;
        } else if (timeVal >= 15) {
            breakType = 'Digital Detox';
            durationMin = 15;
        } else if (fatVal <= 2 && strVal <= 1) {
            breakType = '5-Min Walk';
            durationMin = 5;
        } else if (timeVal === 10) {
            breakType = 'Hydration Reset';
            durationMin = 5;
        } else {
            breakType = 'Eye Rest 20-20-20';
            durationMin = 5;
        }

        res.json({
            break_type: breakType,
            duration_minutes: durationMin,
            is_fallback: true
        });
    } catch (error) {
        res.json({ break_type: 'Eye Rest 20-20-20', duration_minutes: 5, is_fallback: true });
    }
});

module.exports = router;
