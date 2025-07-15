const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 8080;

const APP_ID = process.env.AGORA_APP_ID; // Get from .env file
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE; // Get from .env file

app.use(cors()); // Allow cross-origin requests

// Middleware to prevent server caching
const nocache = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
};

// Root route to check server status
app.get('/', (req, res) => {
    res.send('Token server is live!');
});

// Token generation logic
const generateRtcToken = (req, res) => {
    const channelName = req.query.channelName;
    const stringUid = req.query.uid || '0';

    if (!APP_ID || !APP_CERTIFICATE) {
        return res.status(500).json({ error: 'Agora credentials not set in .env file' });
    }

    if (!channelName) {
        return res.status(400).json({ error: 'channelName is required' });
    }

    // Convert UID string to a unique numeric UID
    let uid = 0;
    for (let i = 0; i < stringUid.length; i++) {
        uid = (uid << 5) - uid + stringUid.charCodeAt(i);
        uid |= 0; // Convert to 32bit integer
    }
    uid = Math.abs(uid); // Ensure it's positive

    const role = RtcRole.PUBLISHER; // Publisher role for sending streams
    const expireTime = 3600; // Token expires in 1 hour
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpireTime
    );

    // Return the generated token and UID
    return res.json({ token, uid });
};

app.get('/get-token', nocache, generateRtcToken);

// Start the server
app.listen(PORT, () => {
    console.log(`Token server running on port ${PORT}`);
});
