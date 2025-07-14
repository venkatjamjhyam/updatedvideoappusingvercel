import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// *** MODIFIED to accept the numeric UID ***
function VideoCall({ appId, channelName, token, uid, onEndCall, onAddUser }) {
    const [remoteUsers, setRemoteUsers] = useState({});
    const [localTracks, setLocalTracks] = useState([]);
    
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const localPlayerRef = useRef(null);

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

    const handleUserUnpublished = (user, mediaType) => {
        if (mediaType === 'video') {
            setRemoteUsers(prevUsers => ({
                ...prevUsers,
                [user.uid]: { ...(prevUsers[user.uid] || {}), user, hasVideo: false }
            }));
        }
    };
    
    const handleUserLeft = (user) => {
        setRemoteUsers(previousUsers => {
          const newUsers = { ...previousUsers };
          delete newUsers[user.uid];
          return newUsers;
        });
    };

    useEffect(() => {
        agoraEngine.on('user-published', handleUserPublished);
        agoraEngine.on('user-unpublished', handleUserUnpublished);
        agoraEngine.on('user-left', handleUserLeft);

        const joinChannel = async () => {
            if (!appId) {
                console.error("Agora App ID is missing. Please set it in MainApp.js");
                alert("Agora App ID is missing. Please set it in MainApp.js");
                return;
            }
            try {
                // *** MODIFIED to join with the numeric UID ***
                await agoraEngine.join(appId, channelName, token, uid); 
                
                const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
                setLocalTracks(tracks);
                
                if (localPlayerRef.current) {
                  tracks[1].play(localPlayerRef.current);
                }

                await agoraEngine.publish(tracks);
            } catch (error) {
                console.error("Failed to join Agora channel", error);
                alert("Could not start video call. See console for details.");
                onEndCall();
            }
        };

        joinChannel();

        return () => {
            for (const track of localTracks) {
                track.stop();
                track.close();
            }
            agoraEngine.off('user-published', handleUserPublished);
            agoraEngine.off('user-unpublished', handleUserUnpublished);
            agoraEngine.off('user-left', handleUserLeft);
            agoraEngine.leave();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appId, channelName, token, uid]); // Added uid to dependency array

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
                {/* Your own video */}
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