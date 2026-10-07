const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Ensure Google DNS is used for SRV record resolution on Windows
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
    console.warn("⚠️ Custom DNS servers could not be set, using default DNS.");
}

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
            serverSelectionTimeoutMS: 15000
        });
        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        console.error(`💡 Common Fixes:`);
        console.error(`   1. Add your IP address to MongoDB Atlas Network Access (0.0.0.0/0)`);
        console.error(`   2. Verify database username and password in .env file`);
        console.error(`   3. Check your internet connection or firewall/VPN blocking port 27017`);
        process.exit(1);
    }
};

module.exports = connectDB;
