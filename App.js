import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { ref, set, onDisconnect, onValue, remove, update } from 'firebase/database';

import Login from './Login';
import SignUp from './SignUp';
import ContactList from './ContactList';
import AddUserModal from './AddUserModal';
import VideoCall from './VideoCall';
import './App.css';

const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;

function App() {
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(true);
    const [inCall, setInCall] = useState(false);
    const [callConfig, setCallConfig] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const userStatusRef = ref(db, `/onlineUsers/${currentUser.uid}`);
                const userData = {
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    online: true,
                    inCall: false,
                };

                set(userStatusRef, userData);
                onDisconnect(userStatusRef).remove();
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        if (auth.currentUser) {
            const userStatusRef = ref(db, `/onlineUsers/${auth.currentUser.uid}`);
            await remove(userStatusRef);
        }
        await signOut(auth);
    };

    const updateUserCallStatus = useCallback((isBusy) => {
        if (user) {
            const userStatusRef = ref(db, `onlineUsers/${user.uid}`);
            update(userStatusRef, { inCall: isBusy });
        }
    }, [user]);

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
    }, [user, inCall, updateUserCallStatus]);

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

        const callData = {
            callerId: user.uid,
            callerName: user.displayName || user.email,
            channel: channelToJoin,
        };

        const callRef = ref(db, `calls/${calleeId}`);
        await set(callRef, callData);

        if (!inCall) {
            updateUserCallStatus(true);
            setCallConfig({ appId: AGORA_APP_ID, channel: channelToJoin, token: null, uid: user.uid });
            setInCall(true);
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        updateUserCallStatus(true);
        setCallConfig({ appId: AGORA_APP_ID, channel: incomingCall.channel, token: null, uid: user.uid });
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
            updatePassword(auth.currentUser, newPassword)
                .then(() => alert("Password updated successfully!"))
                .catch((error) => alert("Error updating password: " + error.message));
        }
    };

    if (!user) {
        return (
            <div className="auth-wrapper">
                <div className="auth-container">
                    {showLogin ? <Login onToggle={() => setShowLogin(false)} /> : <SignUp onToggle={() => setShowLogin(true)} />}
                </div>
            </div>
        );
    }

    // 🔍 Debug logging
    console.log("CallConfig at render:", callConfig);

    return (
        <div className="main-app-container">
            {isAddUserModalOpen && (
                <AddUserModal onClose={() => setIsAddUserModalOpen(false)} onSelectUser={startOrInviteToCall} />
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

            {inCall && callConfig?.appId && callConfig?.channel ? (
                <VideoCall
                    appId={callConfig.appId}
                    channelName={callConfig.channel}
                    uid={callConfig.uid}
                    token={callConfig.token}
                    onEndCall={handleEndCall}
                    onAddUser={() => setIsAddUserModalOpen(true)}
                />
            ) : null}

            {!inCall && (
                <>
                    <div className="header">
                        <span className="welcome-message">Welcome, {user.displayName || user.email}!</span>
                        <div className="account-menu">
                            <button onClick={() => setIsAddUserModalOpen(true)}>Add User</button>
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>Profile</button>
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

export default App;
