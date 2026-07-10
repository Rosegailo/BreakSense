const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;

try {
  let serviceAccount;

  // 1. Check if we are on Render (using environment variable)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // 2. Otherwise, use the local file for development
    serviceAccount = require('./firebase-key.json');
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
  }

  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  console.log("Connected to Firebase Firestore");
} catch (error) {
  console.error("CRITICAL: Failed to initialize Firebase!");
  console.error("Error details:", error.message);
}

module.exports = db;
