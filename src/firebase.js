// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCHNkIh_DTWi64svckIY-_3KLMEbamKRIU",
  authDomain: "web-to-web-app.firebaseapp.com",
  projectId: "web-to-web-app",
  storageBucket: "web-to-web-app.firebasestorage.app",
  messagingSenderId: "367804442870",
  appId: "1:367804442870:web:b152c4549230623c0ce4d7",
  measurementId: "G-66CLSH998P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getDatabase(app);