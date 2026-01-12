// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDupZXDjmK0_Q0djAF9W22o1cGoP5vASIU",
  authDomain: "neverita-fit.firebaseapp.com",
  projectId: "neverita-fit",
  storageBucket: "neverita-fit.firebasestorage.app",
  messagingSenderId: "648796407152",
  appId: "1:648796407152:web:fd2f55ea7c8c4b447a7bb5",
  measurementId: "G-ZTD2W1C2NL"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
