import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Real Firebase Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAfJLts0efa9tCX7gnBAyy_zfjTeYby89o",
  authDomain: "barmedina-fa97f.firebaseapp.com",
  projectId: "barmedina-fa97f",
  storageBucket: "barmedina-fa97f.firebasestorage.app",
  messagingSenderId: "958942316172",
  appId: "1:958942316172:web:fc0f52961af73d6af4dda9",
  measurementId: "G-4SWMFLPK9P"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence (Platform Specific)
let auth: any;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

const db = getFirestore(app, "barmitzvamedina");
const storage = getStorage(app);

export { auth, db, storage };
