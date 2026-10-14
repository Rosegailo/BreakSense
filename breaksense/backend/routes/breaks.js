/**
 * Break Management & Analytics Routes
 * Handles break history retrieval, break logging, study session tracking,
 * real-time counselor analytics calculations, and KNN ML recommendation calls.
 */
const express = require('express');
const router = express.Router();
const Break = require('../models/Break');
const User = require('../models/User');
const axios = require('axios');

/**
 * GET /api/breaks/history
 * Retrieves full break activity history for a specific student sorted by date.
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const history = await Break.find({ user_id: userId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/breaks/save
 * Saves a completed break activity record with user ratings and duration.
 */
router.post('/save', async (req, res) => {
    try {
        const { break_type, category, duration_taken, fatigue_before, stress_before, rating, user_id, session_number } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id parameter is required' });
        }

        const newBreak = new Break({
            user_id,
            break_type: break_type || 'Recovery Break',
            category: category || 'Rest & Recovery',
            duration_taken: parseInt(duration_taken || 5),
            fatigue_before: parseInt(fatigue_before || 3),
            stress_before: parseInt(stress_before || 2),
            rating: parseInt(rating || 5),
            session_number: parseInt(session_number || 1)
        });
        await newBreak.save();

        // Update student DayStreak and LastStudyDate
        const user = await User.findById(user_id);
        if (user) {
            const todayStr = new Date().toISOString().split('T')[0];
            const lastDate = user.LastStudyDate ? new Date(user.LastStudyDate).toISOString().split('T')[0] : null;

            if (lastDate !== todayStr) {
                if (lastDate) {
                    const prevDate = new Date(lastDate);
                    const currDate = new Date(todayStr);
                    const diffTime = Math.abs(currDate - prevDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        user.DayStreak = (user.DayStreak || 0) + 1;
                    } else if (diffDays > 1) {
                        user.DayStreak = 1;
                    }
                } else {
                    user.DayStreak = 1;
                }
                user.LastStudyDate = new Date();
                await user.save();
            }
        }

        res.status(200).json({ success: true, message: 'Break saved successfully', breakRecord: newBreak });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/breaks/log-study
 * Logs a completed Pomodoro study session and updates student daily study stats.
 */
router.post('/log-study', async (req, res) => {
    try {
        const { user_id, study_duration, clientDate } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id parameter is required' });
        }

        const todayStr = clientDate || new Date().toISOString().split('T')[0];
        const durationVal = parseInt(study_duration || 0);

        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const lastDate = user.LastStudyDate ? new Date(user.LastStudyDate).toISOString().split('T')[0] : null;
        if (lastDate === todayStr) {
            user.SessionsToday = (user.SessionsToday || 0) + 1;
            user.TotalStudyTimeToday = (user.TotalStudyTimeToday || 0) + durationVal;
        } else {
            if (lastDate) {
                const prevDate = new Date(lastDate);
                const currDate = new Date(todayStr);
                const diffTime = Math.abs(currDate - prevDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    user.DayStreak = (user.DayStreak || 0) + 1;
                } else if (diffDays > 1) {
                    user.DayStreak = 1;
                }
            } else {
                user.DayStreak = 1;
            }
            user.SessionsToday = 1;
            user.TotalStudyTimeToday = durationVal;
        }
        user.LastStudyDate = new Date();

        // Only expire time-limited analytics permissions if the expiry date has passed
        const now = new Date();
        if (user.permissionExpiry && now > new Date(user.permissionExpiry)) {
            user.analyticsAccessStatus = 'none';
            user.dataSharingPermission = 'none';
            user.permissionExpiry = null;
        }

        await user.save();

        const focusBreak = new Break({
            user_id,
            break_type: 'Study Session',
            category: 'Focus Time',
            duration_taken: durationVal,
            rating: 5
        });
        await focusBreak.save();

        res.status(200).json({ success: true, message: 'Study session logged successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/breaks/stats
 * Computes live analytics metrics, category distributions, and evidence-based
 * actionable counselor advice for a student's session history.
 */
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

        // Evidence-Based Actionable Advice Generator (Audited Scientific Wording)
        let actionableAdvice = "";
        let researchCitation = "";

        if (stats.totalBreaks === 0) {
            actionableAdvice = "No recovery breaks recorded yet. In a lab study, two brief breaks kept participants' performance from dropping over a 50-minute task (Ariga & Lleras, 2011, Cognition). Consider scheduling short breaks during long study sessions, for example every 25-30 minutes, and logging them.";
            researchCitation = "Ariga & Lleras (2011), Cognition";
        } else if (avgScoreVal < 3.0) {
            actionableAdvice = `Average refresh score is low (${avgScoreVal.toFixed(1)}/5.0). Mental fatigue has been linked to higher perceived effort on a later physical task (Marcora et al., 2009, J Appl Physiol). Try a different break type, such as a short walk, and track whether your ratings improve.`;
            researchCitation = "Marcora et al. (2009), Journal of Applied Physiology";
        } else if (topCat.toLowerCase().includes('physical') || topCat.toLowerCase().includes('move')) {
            actionableAdvice = `Student relies mainly on physical movement (${stats.counts['Physical Movement']} breaks). In two randomized trials of 15-minute lunchtime park walks, restoration rose and fatigue fell, most clearly in the fall trial (de Bloom et al., 2017, J Environ Psychol). Encourage light walks between heavy study blocks.`;
            researchCitation = "de Bloom et al. (2017), Journal of Environmental Psychology";
        } else if (topCat.toLowerCase().includes('mind')) {
            actionableAdvice = `Student favors mindfulness (${stats.counts['Mindfulness']} breaks). Lunchtime relaxation exercises (muscle relaxation, deep breathing, nonjudgmental attention) were linked to lower end-of-day stress and fatigue and better afternoon concentration compared with regular lunch breaks (Sianoja et al., 2018, J Occup Health Psychol).`;
            researchCitation = "Sianoja et al. (2018), Journal of Occupational Health Psychology";
        } else if (topCat.toLowerCase().includes('nutrition')) {
            actionableAdvice = `Student's top recovery category is Nutrition & Hydration (${stats.counts['Nutrition']} breaks). Mild dehydration (~1.5% body mass loss) was linked to more vigilance errors and slower working memory responses in young men (Ganio et al., 2011, Br J Nutr) and to worse mood and higher perceived task difficulty in young women (Armstrong et al., 2012, J Nutr). Consider drinking water during breaks.`;
            researchCitation = "Ganio et al. (2011) & Armstrong et al. (2012)";
        } else {
            actionableAdvice = `Student relies on Rest & Recovery (${stats.counts['Rest & Recovery']} breaks). In a lab study, two brief breaks kept participants' performance from dropping over a 50-minute task (Ariga & Lleras, 2011, Cognition). Suggest pairing passive rest with visual disengagement (20-20-20 rule).`;
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

/**
 * POST /api/breaks/recommend
 * Dispatches fatigue/stress inputs to the KNN ML Microservice with fallback logic.
 */
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
