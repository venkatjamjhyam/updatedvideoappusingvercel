import React, { useState } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get } from 'firebase/database';

function Login({ onToggle }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        let emailToLogin = identifier;

        if (!identifier.includes('@')) {
            try {
                const usernameRef = ref(db, `usernames/${identifier.toLowerCase()}`);
                const usernameSnapshot = await get(usernameRef);

                if (!usernameSnapshot.exists()) {
                    setError('User not found.');
                    return;
                }

                const uid = usernameSnapshot.val();
                const userRef = ref(db, `users/${uid}`);
                const userSnapshot = await get(userRef);

                if (!userSnapshot.exists()) {
                    setError('User data not found. Please contact support.');
                    return;
                }

                emailToLogin = userSnapshot.val().email;

            } catch (dbError) {
                setError('Failed to look up user. Please try again.');
                console.error("Database lookup failed:", dbError);
                return;
            }
        }

        try {
            await signInWithEmailAndPassword(auth, emailToLogin, password);
        } catch (authError) {
            setError('Invalid email/username or password.');
            console.error("Login failed:", authError.message);
        }
    };

    const handleForgotPassword = async () => {
        const email = prompt("Please enter your email address to reset your password:");
        if (!email) {
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent! Please check your inbox.");
        } catch (error) {
            setError(error.message.replace('Firebase: ', ''));
            console.error("Password reset error:", error);
        }
    };

    return (
        <div>
            <form onSubmit={handleLogin}>
                <h2>Login</h2>
                {error && <p className="error-message">{error}</p>}
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or Username"
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                />
                <button type="submit">Login</button>
            </form>
            <div className="forgot-password">
                <button type="button" onClick={handleForgotPassword}>
                    Forgot Password?
                </button>
            </div>
            <div className="toggle-form">
                Don't have an account? <button onClick={onToggle}>Sign Up</button>
            </div>
        </div>
    );
}

export default Login;