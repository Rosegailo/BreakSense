require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const breakRoutes = require('./routes/breaks');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const path = require('path');

app.use('/api/breaks', breakRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/download-apk', (req, res) => {
    const apkPath = path.join(__dirname, '../mobile/android/app/build/outputs/apk/release/app-release.apk');
    res.download(apkPath, 'BreakSense.apk', (err) => {
        if (err && !res.headersSent) {
            res.status(404).send('APK file not found on server.');
        }
    });
});

app.get('/health', (_, res) => {
    res.json({ 
        status: 'ok', 
        ts: new Date(),
        ai_key_configured: !!process.env.GEMINI_API_KEY 
    });
});

app.use((_, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.use((err, req, res, next) => {
    console.error("!!! SERVER ERROR !!!");
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: err.message 
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BreakSense API is Live`);
    console.log(`- Local Access:   http://localhost:${PORT}`);
    console.log(`- Network Access: http://192.168.254.160:${PORT}`);
    console.log(`- Environment:    ${process.env.NODE_ENV || 'development'}`);
});