import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, set, onDisconnect, remove } from 'firebase/database';

import Login from './Login';
import SignUp from './SignUp';
import MainApp from './MainApp';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const userStatusRef = ref(db, `/onlineUsers/${currentUser.uid}`);
                
                // MODIFIED: Added inCall property
                const userData = {
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    online: true,
                    inCall: false, // NEW: Initialize user as not in a call
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

    if (!user) {
        return (
            <div className="auth-wrapper">
                <div className="auth-container">
                    {showLogin ? (
                        <Login onToggle={() => setShowLogin(false)} />
                    ) : (
                        <SignUp onToggle={() => setShowLogin(true)} />
                    )}
                </div>
            </div>
        );
    }

    return <MainApp user={user} handleLogout={handleLogout} />;
}

export default App;