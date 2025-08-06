// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcH6g1-OWZFkVzo-WG7XoQadMLo-AS6kg",
  authDomain: "hey-seraa.firebaseapp.com",
  projectId: "hey-seraa",
  storageBucket: "hey-seraa.firebasestorage.app",
  messagingSenderId: "969955693325",
  appId: "1:969955693325:web:1655a56c0b92b944549644",
  measurementId: "G-Y7RLZGL4YH"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);