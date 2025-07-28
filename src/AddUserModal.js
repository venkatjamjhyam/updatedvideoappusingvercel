import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { ref, onValue } from 'firebase/database';

function AddUserModal({ onClose, onSelectUser }) {
    const [allUsers, setAllUsers] = useState({});
    const [onlineUsers, setOnlineUsers] = useState({});
    const currentUser = auth.currentUser;

    useEffect(() => {
        const usersRef = ref(db, 'users/');
        const onlineUsersRef = ref(db, 'onlineUsers/');

        const unsubscribeAll = onValue(usersRef, (snapshot) => {
            const data = snapshot.val() || {};
            setAllUsers(data);
        });

        const unsubscribeOnline = onValue(onlineUsersRef, (snapshot) => {
            const data = snapshot.val() || {};
            setOnlineUsers(data);
        });

        return () => {
            unsubscribeAll();
            unsubscribeOnline();
        };
    }, []);

    const handleCallClick = (uid, displayName) => {
        onSelectUser(uid, displayName);
        onClose();
    };

    return (
        <div className="add-user-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Add User to Call</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <ul className="user-list">
                    {Object.keys(allUsers).length > 1 ? (
                        Object.keys(allUsers).map(uid => {
                            if (uid === currentUser.uid) return null;
                            
                            const user = allUsers[uid];
                            const isOnline = !!onlineUsers[uid];
                            const isInCall = isOnline && onlineUsers[uid].inCall === true;

                            return (
                                <li key={uid}>
                                    <div className="user-info">
                                        <span className={`status-indicator ${isOnline ? (isInCall ? 'in-call' : 'online') : 'offline'}`}></span>
                                        <span className="user-name">{user.displayName || user.email}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCallClick(uid, user.displayName || user.email)} 
                                        disabled={!isOnline || isInCall}
                                        title={
                                            !isOnline 
                                                ? `${user.displayName || user.email} is offline` 
                                                : isInCall 
                                                ? `${user.displayName || user.email} is in another call`
                                                : `Call ${user.displayName || user.email}`
                                        }
                                    >
                                        {isInCall ? 'In Call' : 'Video Call'}
                                    </button>
                                </li>
                            );
                        })
                    ) : (
                        <li>No other users have registered.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

export default AddUserModal;