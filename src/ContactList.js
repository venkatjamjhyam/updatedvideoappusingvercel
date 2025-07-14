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

    // **MODIFIED**: This logic is now enhanced to check the 'inCall' status.
    const otherUsers = Object.keys(onlineUsers).filter(uid => uid !== currentUser.uid);

    return (
        <div className="contact-list">
            <h3>Online Users</h3>
            <ul>
                {otherUsers.length > 0 ? (
                    otherUsers.map(uid => {
                        const user = onlineUsers[uid];
                        const displayName = user.displayName || user.email;
                        
                        // NEW: Check if the user is currently in a call.
                        const isInCall = user.inCall === true;

                        return (
                            <li key={uid}>
                                {displayName}
                                <button 
                                    onClick={() => onSelectUser(uid, displayName)}
                                    // NEW: Disable the button if the user is in a call.
                                    disabled={isInCall}
                                    // NEW: Provide a helpful title for the button state.
                                    title={
                                        isInCall 
                                        ? `${displayName} is in another call` 
                                        : `Call ${displayName}`
                                    }
                                >
                                    {/* NEW: Change button text based on status. */}
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