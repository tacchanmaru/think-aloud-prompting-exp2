// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAKLMfxKH0RwdGh2QF_hWVHR2qUH4nHm0",
  authDomain: "think-aloud-prompting-exp2.firebaseapp.com",
  projectId: "think-aloud-prompting-exp2",
  storageBucket: "think-aloud-prompting-exp2.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
