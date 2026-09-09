const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'counselor'], default: 'student' },

    // Stats for Dashboard
    SessionsToday: { type: Number, default: 0 },
    TotalStudyTimeToday: { type: Number, default: 0 },
    DayStreak: { type: Number, default: 0 },
    LastStudyDate: { type: Date, default: null },

    // Settings
    pomodoro_duration: { type: String, default: '25 min' },
    sessions_per_cycle: { type: Number, default: 4 },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
