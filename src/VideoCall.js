import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { ref as dbRef, set as dbSet } from 'firebase/database';
import { db } from './firebase';

const agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

function VideoCall({ appId, channelName, onEndCall, onAddUser, uid }) {
    const [remoteUsers, setRemoteUsers] = useState({});
    const [localTracks, setLocalTracks] = useState([]);
    const localTracksRef = useRef([]);
    const hasJoinedRef = useRef(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [missingParams, setMissingParams] = useState(false);

    const localPlayerRef = useRef(null);

    const handleUserPublished = async (user, mediaType) => {
        await agoraEngine.subscribe(user, mediaType);
        setRemoteUsers(prev => ({
            ...prev,
            [user.uid]: {
                user,
                hasVideo: mediaType === 'video'
            }
        }));

        if (mediaType === 'audio') {
            user.audioTrack?.play();
        }
    };

    const handleUserUnpublished = (user, mediaType) => {
        if (mediaType === 'video') {
            setRemoteUsers(prev => ({
                ...prev,
                [user.uid]: { ...(prev[user.uid] || {}), hasVideo: false }
            }));
        }
    };

    const handleUserLeft = (user) => {
        setRemoteUsers(prev => {
            const updated = { ...prev };
            delete updated[user.uid];
            return updated;
        });
    };

    useEffect(() => {
        if (!appId || !channelName) {
            console.error("Missing required parameters: App ID or Channel Name");
            setMissingParams(true);
            return;
        }

        if (hasJoinedRef.current) return;
        hasJoinedRef.current = true;

        const createChannelInFirebase = async () => {
            const roomRef = dbRef(db, `rooms/${channelName}`);
            await dbSet(roomRef, {
                createdBy: uid,
                createdAt: new Date().toISOString(),
                active: true
            });
        };

        const joinChannel = async () => {
            try {
                await createChannelInFirebase();
                await agoraEngine.join(appId, channelName, null, uid);

                agoraEngine.on('user-published', handleUserPublished);
                agoraEngine.on('user-unpublished', handleUserUnpublished);
                agoraEngine.on('user-left', handleUserLeft);

                const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
                setLocalTracks(tracks);
                localTracksRef.current = tracks;

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
            localTracksRef.current.forEach(track => {
                track.stop();
                track.close();
            });

            agoraEngine.off('user-published', handleUserPublished);
            agoraEngine.off('user-unpublished', handleUserUnpublished);
            agoraEngine.off('user-left', handleUserLeft);

            agoraEngine.leave();
        };
    }, [appId, channelName, uid, onEndCall]);

    const toggleAudio = async () => {
        if (localTracks[0]) {
            await localTracks[0].setMuted(!isAudioMuted);
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = async () => {
        if (localTracks[1]) {
            const newState = !isVideoMuted;
            await localTracks[1].setEnabled(newState);
            if (newState && localPlayerRef.current) {
                localTracks[1].play(localPlayerRef.current);
            }
            setIsVideoMuted(!isVideoMuted);
        }
    };

    if (missingParams) {
        return (
            <div className="video-call-error">
                <h3>Error: Missing App ID or Channel Name</h3>
                <p>Please check your configuration and try again.</p>
                <button onClick={onEndCall} className="end-call-btn">Back</button>
            </div>
        );
    }

    return (
        <div className="video-call-container">
            <div className="video-players">
                <div className="video-player">
                    <div ref={localPlayerRef} style={{ display: isVideoMuted ? 'none' : 'block' }}></div>
                    {isVideoMuted && <div className="video-placeholder">Camera Off</div>}
                    <span>You</span>
                </div>

                {Object.values(remoteUsers).map(({ user, hasVideo }) => (
                    <RemoteUserPlayer key={user.uid} user={user} hasVideo={hasVideo} />
                ))}
            </div>

            <div className="call-controls">
                <button className="control-btn" onClick={toggleAudio}>
                    {isAudioMuted ? 'Unmute' : 'Mute'}
                </button>
                <button className="control-btn" onClick={toggleVideo}>
                    {isVideoMuted ? 'Cam On' : 'Cam Off'}
                </button>
                <button className="control-btn" onClick={onAddUser}>Add User</button>
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
            <span>{user.displayName || user.uid || 'Remote User'}</span>
        </div>
    );
};

export default VideoCall;
