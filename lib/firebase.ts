import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDX0UVTdC6OMBRd3pjVk2ID_nlYvdkL_CI",
  authDomain: "humanbingo-5aa5c.firebaseapp.com",
  databaseURL: "https://humanbingo-5aa5c-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "humanbingo-5aa5c",
  storageBucket: "humanbingo-5aa5c.firebasestorage.app",
  messagingSenderId: "277537468995",
  appId: "1:277537468995:web:23d7128f246720d69adaf6",
  measurementId: "G-J700CHMTD0",
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const database = getDatabase(app)

export { app, database }
