const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("❌ CRITICAL: MONGODB_URI is missing in environment variables!");
            process.exit(1);
        }

        // Clean the URI (remove quotes or accidental spaces)
        uri = uri.trim().replace(/^["'](.+)["']$/, '$1');

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
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
