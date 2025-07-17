// D:\agora video web\my-video-app\src\MainApp.js

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { updatePassword } from 'firebase/auth';
import { ref, set, onValue, remove, update } from 'firebase/database';
import ContactList from './ContactList';
import VideoCall from './VideoCall';
import AddUserModal from './AddUserModal';

function MainApp({ user, handleLogout }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [callConfig, setCallConfig] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

    const AGORA_APP_ID = '8921a9b25e124ac1b4461f45f3b4b91c';
    const TOKEN_SERVER_URL = 'https://updatedvideoappusingvercel.onrender.com/';


    // *** MODIFIED to return both token and uid ***
    const fetchTokenAndUid = async (channelName) => {
        try {
            const response = await fetch(`${TOKEN_SERVER_URL}/get-token?channelName=${channelName}&uid=${user.uid}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Token server responded with status: ${response.status}`);
            }
            const data = await response.json();
            return { token: data.token, uid: data.uid }; // Return both
        } catch (error) {
            console.error("Token fetch error:", error);
            if (error instanceof TypeError) {
                 alert(`Could not connect to the token server at ${TOKEN_SERVER_URL}. Please ensure the server is running.`);
            } else {
                 alert(`Error fetching token: ${error.message}`);
            }
            return null;
        }
    };

    const updateUserCallStatus = (isBusy) => {
        if (user) {
            const userStatusRef = ref(db, `onlineUsers/${user.uid}`);
            update(userStatusRef, { inCall: isBusy });
        }
    };

    useEffect(() => {
        if (!user) return;
        const callRef = ref(db, `calls/${user.uid}`);
        
        const unsubscribe = onValue(callRef, (snapshot) => {
            const callData = snapshot.val();
            if (callData && !inCall) {
                setIncomingCall(callData);
            } else if (!callData) {
                setIncomingCall(null);
            }
        });

        if (!inCall) {
            updateUserCallStatus(false);
        }

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, inCall]);

    const startOrInviteToCall = async (calleeId, calleeName) => {
        let channelToJoin;

        if (inCall && callConfig) {
            channelToJoin = callConfig.channel;
        } else {
            const uids = [user.uid, calleeId].sort();
            const safeUid1 = uids[0].replace(/[^a-zA-Z0-9]/g, '');
            const safeUid2 = uids[1].replace(/[^a-zA-Z0-9]/g, '');
            channelToJoin = `call-${safeUid1}-${safeUid2}`;
        }
        
        console.log(`Inviting ${calleeName} to channel: ${channelToJoin}`);

        const callData = {
            callerId: user.uid,
            callerName: user.displayName || user.email,
            channel: channelToJoin,
        };

        const callRef = ref(db, `calls/${calleeId}`);
        await set(callRef, callData);

        if (!inCall) {
            const tokenData = await fetchTokenAndUid(channelToJoin);
            if (!tokenData) return;

            updateUserCallStatus(true);
            setCallConfig({ 
                appId: AGORA_APP_ID, 
                channel: channelToJoin, 
                token: tokenData.token,
                uid: tokenData.uid // Pass the numeric UID
            });
            setInCall(true);
        }
    };
    
    const handleAcceptCall = async () => {
        if (!incomingCall) return;
        
        const tokenData = await fetchTokenAndUid(incomingCall.channel);
        if (!tokenData) {
            handleDeclineCall();
            return;
        }
        
        updateUserCallStatus(true);
        setCallConfig({
            appId: AGORA_APP_ID,
            channel: incomingCall.channel,
            token: tokenData.token,
            uid: tokenData.uid // Pass the numeric UID
        });
        setInCall(true);
        
        const callRef = ref(db, `calls/${user.uid}`);
        remove(callRef);
        setIncomingCall(null);
    };

    const handleDeclineCall = () => {
        if (!incomingCall) return;
        const callRef = ref(db, `calls/${user.uid}`);
        remove(callRef);
        setIncomingCall(null);
    };
    
    const handleEndCall = () => {
        setInCall(false);
        setCallConfig(null);
        setIncomingCall(null);
        updateUserCallStatus(false);
    };
    
    const handleChangePassword = () => {
        setIsMenuOpen(false);
        const newPassword = prompt("Please enter your new password:");
        if (newPassword) {
            updatePassword(auth.currentUser, newPassword).then(() => {
                alert("Password updated successfully!");
            }).catch((error) => {
                alert("Error updating password: " + error.message);
            });
        }
    };

    return (
        <div className="main-app-container">
            {isAddUserModalOpen && (
                <AddUserModal
                    onClose={() => setIsAddUserModalOpen(false)}
                    onSelectUser={startOrInviteToCall}
                />
            )}

            {incomingCall && !inCall && (
                <div className="incoming-call-modal">
                    <div className="modal-content">
                        <h4>Incoming Call from {incomingCall.callerName}</h4>
                        <div className="modal-actions">
                            <button className="accept-btn" onClick={handleAcceptCall}>Accept</button>
                            <button className="decline-btn" onClick={handleDeclineCall}>Decline</button>
                        </div>
                    </div>
                </div>
            )}

            {inCall && callConfig ? (
                <VideoCall 
                    appId={callConfig.appId} 
                    channelName={callConfig.channel}
                    token={callConfig.token}
                    uid={callConfig.uid} // Pass UID to VideoCall
                    onEndCall={handleEndCall} 
                    onAddUser={() => setIsAddUserModalOpen(true)}
                />
            ) : (
                <>
                    <div className="header">
                        <span className="welcome-message">Welcome, {user.displayName || user.email}!</span>
                        <div className="account-menu">
                            <button onClick={() => setIsAddUserModalOpen(true)}>Add User</button>
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>Account</button>
                            {isMenuOpen && (
                                <div className="dropdown-content">
                                    <button onClick={handleChangePassword}>Change Password</button>
                                    <button onClick={handleLogout}>Log Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="app-body">
                        <ContactList onSelectUser={startOrInviteToCall} />
                    </div>
                </>
            )}
        </div>
    );
}

export default MainApp;