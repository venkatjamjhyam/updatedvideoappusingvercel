import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { ref, onValue } from 'firebase/database';

function ContactList({ onSelectUser }) {
    const [onlineUsers, setOnlineUsers] = useState({});
    const currentUser = auth.currentUser;

    useEffect(() => {
        const usersRef = ref(db, '/onlineUsers');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val() || {};
            setOnlineUsers(data);
        });
        return () => unsubscribe();
    }, []);

    const otherUsers = Object.keys(onlineUsers).filter(uid => uid !== currentUser.uid);

    return (
        <div className="contact-list">
            <h3>Online Users</h3>
            <ul>
                {otherUsers.length > 0 ? (
                    otherUsers.map(uid => {
                        const user = onlineUsers[uid];
                        const displayName = user.displayName || user.email;
                        const isInCall = user.inCall === true;

                        return (
                            <li key={uid}>
                                {displayName}
                                <button 
                                    onClick={() => onSelectUser(uid, displayName)}
                                    disabled={isInCall}
                                    title={
                                        isInCall 
                                        ? `${displayName} is in another call` 
                                        : `Call ${displayName}`
                                    }
                                >
                                    {isInCall ? 'In Call' : 'Video Call'}
                                </button>
                            </li>
                        );
                    })
                ) : (
                    <li>No other users are online.</li>
                )}
            </ul>
        </div>
    );
}
export default ContactList;