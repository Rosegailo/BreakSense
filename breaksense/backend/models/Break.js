const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    break_type: { type: String, required: true },
    category: { type: String, required: true },
    duration_taken: { type: Number, default: 0 },
    fatigue_before: { type: Number, default: 1 },
    stress_before: { type: Number, default: 1 },
    rating: { type: Number, default: 5 },
    session_number: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Break', breakSchema);
