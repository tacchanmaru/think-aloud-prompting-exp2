// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6WT75aNX6y9sSl2F95FXB_vp0XoCmZpk",
  authDomain: "think-aloud-prompting-exp2.firebaseapp.com",
  projectId: "think-aloud-prompting-exp2",
  storageBucket: "think-aloud-prompting-exp2.firebasestorage.app",
  messagingSenderId: "1040317309036",
  appId: "1:1040317309036:web:c016610159fd8431edf849",
  measurementId: "G-7WDHYXX57S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
