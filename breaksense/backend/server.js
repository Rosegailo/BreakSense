require('dotenv').config(); // LINE 1: Always load environment variables first
const express = require('express');
const cors = require('cors');

const app = express();


// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
// These MUST come before your routes so the server can read the data you send
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ─── ROUTE IMPORTS ───────────────────────────────────────────────────────────
const breakRoutes = require('./routes/breaks');
const authRoutes = require('./routes/authRoutes');
// ─── ROUTE BINDING ───────────────────────────────────────────────────────────
app.use('/api/breaks', breakRoutes);
app.use('/api/auth', authRoutes);
// ─── UTILITY ROUTES ──────────────────────────────────────────────────────────
// Health check: Visit http://192.168.1.4:3000/health on your laptop to test
app.get('/health', (_, res) => {
    res.json({ 
        status: 'ok', 
        ts: new Date(),
        ai_key_configured: !!process.env.GEMINI_API_KEY 
    });
});

// 404 fallback for undefined paths
app.use((_, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// This captures any crashes and prevents the server from silent-dying
app.use((err, req, res, next) => {
    console.error("!!! SERVER ERROR !!!");
    console.error(err.stack); // This prints the EXACT line number of the crash in your terminal
    res.status(500).json({ 
        error: 'Internal server error', 
        message: err.message 
    });
});

// ─── START SERVER ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// '0.0.0.0' is crucial—it tells the server to listen to your phone, not just the laptop
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BreakSense API is Live`);
    console.log(`- Local Access:   http://localhost:${PORT}`);
    console.log(`- Network Access: http://192.168.254.160:${PORT}`);
    console.log(`- Environment:    ${process.env.NODE_ENV || 'development'}`);
});