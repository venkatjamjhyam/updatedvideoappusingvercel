import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

function SignUp({ onToggle }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const formattedUsername = username.toLowerCase();
        const usernameRef = ref(db, `usernames/${formattedUsername}`);

        try {
            const usernameSnapshot = await get(usernameRef);
            if (usernameSnapshot.exists()) {
                setError('This username is already taken. Please choose another.');
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: username,
            });

            const userRef = ref(db, `users/${user.uid}`);
            await set(userRef, {
                displayName: username,
                email: user.email,
            });
            await set(ref(db, `usernames/${formattedUsername}`), user.uid);

            await signOut(auth);
            setSuccess('Account created successfully! Please log in.');
            
            setTimeout(() => {
                onToggle();
            }, 2000);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setError('This email address is already in use.');
            } else if (error.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else {
                setError(error.message.replace('Firebase: ', ''));
            }
            console.error("Sign up failed:", error.code, error.message);
        }
    };

    return (
        <div>
            <form onSubmit={handleSignUp}>
                <h2>Sign Up</h2>
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength="6"
                />
                <button type="submit">Sign Up</button>
            </form>
            <div className="toggle-form">
                Already have an account? <button onClick={onToggle}>Login</button>
            </div>
        </div>
    );
}

export default SignUp;