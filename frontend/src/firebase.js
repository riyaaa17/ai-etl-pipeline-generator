import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdFnQ0AsHKs_7Z30cK_TiXiWvQLT5P2Vw",
  authDomain: "logical-hallway-499706-c3.firebaseapp.com",
  projectId: "logical-hallway-499706-c3",
  storageBucket: "logical-hallway-499706-c3.firebasestorage.app",
  messagingSenderId: "555034914563",
  appId: "1:555034914563:web:176e50b2932cb30e2cc336"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

