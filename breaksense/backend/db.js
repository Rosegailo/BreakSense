const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Force Node.js to use Google DNS for SRV record resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI is missing in your .env file!");
        }
        const conn = await mongoose.connect(uri);
        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
