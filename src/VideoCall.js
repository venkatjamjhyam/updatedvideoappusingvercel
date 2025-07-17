import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { auth } from './firebase';  // Import Firebase to access auth

const agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// Function to fetch the token from the backend
const getToken = async (channelName) => {
    const userId = auth.currentUser ? auth.currentUser.uid : null; // Get the current user's UID
    if (!userId) {
        console.error("User is not authenticated.");
        return null;
    }

    try {
        const response = await fetch(`https://updatedvideoappusingvercel.onrender.com/get-token?channelName=${channelName}&uid=${userId}`);
        
        if (response.ok) {
            const data = await response.json();  // Parse the JSON response
            
            // Check if the data contains the expected properties
            if (data && data.token && data.uid) {
                console.log('Token:', data.token);
                console.log('User ID:', data.uid);
                return { token: data.token, userId: data.uid };
            } else {
                console.error('Unexpected response format', data);
                return null;
            }
        } else {
            console.error('Error fetching token:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error fetching token:', error);
        return null;
    }
};


function VideoCall({ appId, channelName, onEndCall, onAddUser }) {
    const [remoteUsers, setRemoteUsers] = useState({});
    const [localTracks, setLocalTracks] = useState([]);  // Keep localTracks state for proper cleanup
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const localPlayerRef = useRef(null);

    // Handle remote user published events
    const handleUserPublished = async (user, mediaType) => {
        await agoraEngine.subscribe(user, mediaType);

        if (mediaType === 'video') {
            setRemoteUsers(prevUsers => ({
                ...prevUsers,
                [user.uid]: { user, hasVideo: true }
            }));
        }
        if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    };

    // Handle remote user unpublished events
    const handleUserUnpublished = (user, mediaType) => {
        if (mediaType === 'video') {
            setRemoteUsers(prevUsers => ({
                ...prevUsers,
                [user.uid]: { ...(prevUsers[user.uid] || {}), user, hasVideo: false }
            }));
        }
    };

    // Handle remote user left events
    const handleUserLeft = (user) => {
        setRemoteUsers(previousUsers => {
            const newUsers = { ...previousUsers };
            delete newUsers[user.uid];
            return newUsers;
        });
    };

    // Fetch token and join the Agora channel
    useEffect(() => {
        if (!appId || !channelName) {
            console.error("Agora App ID or Channel Name is missing.");
            return;
        }

        // Fetch the token before joining the channel
        const joinChannel = async () => {
            const userId = auth.currentUser ? auth.currentUser.uid : null; // Get the current user's UID

            if (!userId) {
                console.error("User is not authenticated.");
                return;
            }

            const { token, userId: tokenUserId } = await getToken(channelName, userId); // Pass the userId here

            if (token && tokenUserId) {
                try {
                    // Join Agora channel with the token
                    await agoraEngine.join(appId, channelName, token, tokenUserId);

                    // Create microphone and camera tracks
                    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
                    setLocalTracks(tracks);  // Store tracks in state

                    // Play the local video
                    if (localPlayerRef.current) {
                        tracks[1].play(localPlayerRef.current);  // Video track at index 1
                    }

                    // Publish the tracks to Agora
                    await agoraEngine.publish(tracks);
                } catch (error) {
                    console.error("Failed to join Agora channel", error);
                    alert("Could not start video call. See console for details.");
                    onEndCall();
                }
            } else {
                console.error("Failed to retrieve token or UID.");
            }
        };

        joinChannel();

        return () => {
            // Cleanup: stop and close local tracks when component unmounts
            if (localTracks.length > 0) {
                localTracks.forEach(track => {
                    track.stop();
                    track.close();
                });
            }
            agoraEngine.off('user-published', handleUserPublished);
            agoraEngine.off('user-unpublished', handleUserUnpublished);
            agoraEngine.off('user-left', handleUserLeft);
            agoraEngine.leave();
        };
    }, [appId, channelName, localTracks, onEndCall]);  // Handle only relevant dependencies

    const toggleAudio = async () => {
        if (localTracks[0]) {
            await localTracks[0].setMuted(!isAudioMuted);
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = async () => {
        if (localTracks[1]) {
            await localTracks[1].setEnabled(!isVideoMuted);
            setIsVideoMuted(!isVideoMuted);
        }
    };

    return (
        <div className="video-call-container">
            <div className="video-players">
                {/* Local video */}
                <div className="video-player">
                    <div ref={localPlayerRef} style={{ display: isVideoMuted ? 'none' : 'block' }}></div>
                    {isVideoMuted && <div className="video-placeholder">Camera Off</div>}
                    <span>You</span>
                </div>

                {/* Remote users' videos */}
                {Object.values(remoteUsers).map(({ user, hasVideo }) => (
                    <RemoteUserPlayer user={user} hasVideo={hasVideo} key={user.uid} />
                ))}
            </div>
            
            <div className="call-controls">
                <button className="control-btn" onClick={toggleAudio}>
                    {isAudioMuted ? 'Unmute' : 'Mute'}
                </button>
                <button className="control-btn" onClick={toggleVideo}>
                    {isVideoMuted ? 'Cam On' : 'Cam Off'}
                </button>
                <button className="control-btn" onClick={onAddUser}>
                    Add User
                </button>
                <button className="end-call-btn" onClick={onEndCall}>End Call</button>
            </div>
        </div>
    );
}

const RemoteUserPlayer = ({ user, hasVideo }) => {
    const playerRef = useRef(null);

    useEffect(() => {
        if (playerRef.current && user.videoTrack && hasVideo) {
            user.videoTrack.play(playerRef.current);
        }
    }, [user, hasVideo]);

    return (
        <div className="video-player">
            <div ref={playerRef} style={{ display: hasVideo ? 'block' : 'none', width: '100%', height: '100%' }}></div>
            {!hasVideo && <div className="video-placeholder">Camera Off</div>}
            <span>{user.displayName || user.uid}</span>
        </div>
    );
};

export default VideoCall;
