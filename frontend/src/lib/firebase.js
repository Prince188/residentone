import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDp0QbP9CRlvQKQlJdB6YVrScXas3bijZU",
  authDomain: "residentone-7d9d3.firebaseapp.com",
  projectId: "residentone-7d9d3",
  storageBucket: "residentone-7d9d3.firebasestorage.app",
  messagingSenderId: "155799271603",
  appId: "1:155799271603:web:residentone"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
