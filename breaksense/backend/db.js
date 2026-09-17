const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Force Node.js to prioritize IPv4 and use public DNS for SRV resolution
// This fixes the "querySrv ECONNREFUSED" error common on Windows
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
dns.setServers(['8.8.8.8', '1.1.1.1']);

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
            family: 4 // Force IPv4
        });
        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
