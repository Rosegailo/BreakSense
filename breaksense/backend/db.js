const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("❌ CRITICAL: MONGODB_URI is missing in environment variables!");
            process.exit(1);
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        // On Render, we don't necessarily want to exit(1) immediately if it's a transient error
        // but for a startup connection, it's usually necessary.
        process.exit(1);
    }
};

module.exports = connectDB;
