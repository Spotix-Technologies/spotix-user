
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

// Validate that Firebase config is properly set
const isFirebaseConfigured = Object.values(firebaseConfig).every(value => value !== "")

let app: any
let auth: any
let db: any
let storage: any

if (isFirebaseConfigured) {
  // Initialize Firebase
  app = initializeApp(firebaseConfig)

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app)

  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app)

  storage = getStorage(app)
} else {
  console.warn("Firebase configuration is incomplete. Please set all required environment variables.")
}

export { auth, db, storage }
export default app
