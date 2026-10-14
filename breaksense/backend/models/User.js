/**
 * User Entity Schema
 * Represents student and counselor user accounts, dashboard statistics,
 * application settings, and analytics sharing permission statuses.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Account Credentials & Role
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'counselor'], default: 'student' },

    // Dashboard Study Statistics
    SessionsToday: { type: Number, default: 0 },
    TotalStudyTimeToday: { type: Number, default: 0 },
    DayStreak: { type: Number, default: 0 },
    LastStudyDate: { type: Date, default: null },
    riskLevel: { type: String, enum: ['WATCH LIST', 'STABLE', 'HIGH RISK'], default: null },

    // Timer Preferences
    pomodoro_duration: { type: String, default: '25 min' },
    sessions_per_cycle: { type: Number, default: 4 },

    // Data Sharing & Analytics Access Control
    dataSharingPermission: {
        type: String,
        enum: ['none', 'session', '24hours', '7days', 'analytics_only'],
        default: 'none'
    },
    permissionExpiry: { type: Date, default: null },
    analyticsAccessStatus: {
        type: String,
        enum: ['none', 'pending', 'granted', 'denied'],
        default: 'none'
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
