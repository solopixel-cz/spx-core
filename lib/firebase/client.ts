import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getClientAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());

  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true") {
    connectAuthEmulator(_auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }

  return _auth;
}

export function getClientFirestore(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());

  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true") {
    connectFirestoreEmulator(_db, "127.0.0.1", 8080);
  }

  return _db;
}

export function getClientStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());

  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true") {
    connectStorageEmulator(_storage, "127.0.0.1", 9199);
  }

  return _storage;
}
