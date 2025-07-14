const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 8080;

const APP_ID = '8921a9b25e124ac1b4461f45f3b4b91c';
const APP_CERTIFICATE = '3ef0ba8e81864edf94efdeb5700783ff';

// Allow requests from your React app's origin
app.use(cors());

// A function to prevent server from crashing if credentials are not set
const nocache = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
};

const generateRtcToken = (req, res) => {
    // Check if App ID and Certificate are set
    if (!APP_ID || !APP_CERTIFICATE) {
        console.error("Agora credentials not found in .env file");
        return res.status(500).json({ 'error': 'Agora credentials are not set in the .env file on the server.' });
    }
    
    // Get the channel name from the request's query parameters
    const channelName = req.query.channelName;
    if (!channelName) {
        return res.status(400).json({ 'error': 'channelName is required' });
    }

    // *** IMPORTANT FIX ***
    // The UID must be an integer. Let's ensure it is.
    // We will parse the string UID from Firebase to an integer.
    // We'll use a simple hashing function to convert the string UID to a number.
    const stringUid = req.query.uid || '0';
    let uid = 0;
    if (stringUid) {
        uid = 0;
        for (let i = 0; i < stringUid.length; i++) {
            uid = (uid << 5) - uid + stringUid.charCodeAt(i);
            uid |= 0; // Convert to 32bit integer
        }
        uid = Math.abs(uid); // Ensure it's positive
    }
    
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600; // Token expires in 1 hour
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    console.log(`Generating token for channel: ${channelName}, stringUID: ${stringUid}, numericUID: ${uid}`);

    // Build the token with the numeric UID
    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpireTime
    );

    // Return the token and the numeric UID to the client
    return res.json({ 'token': token, 'uid': uid });
};

// Define the API endpoint
app.get('/get-token', nocache, generateRtcToken);

app.listen(PORT, () => {
    console.log(`Token server listening on port ${PORT}`);
    if (!APP_ID || !APP_CERTIFICATE) {
        console.warn('!!! WARNING: AGORA_APP_ID or AGORA_APP_CERTIFICATE is not set in the .env file. The server will not be able to generate tokens.');
    }
});