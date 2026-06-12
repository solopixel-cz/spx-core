/**
 * Bootstrap script: creates the first admin user.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> [displayName]
 *
 * Works against emulator when FIREBASE_AUTH_EMULATOR_HOST is set,
 * otherwise against production (requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
 *
 * Tip: source .env.local before running:
 *   set -a && source .env.local && set +a && npx tsx scripts/create-admin.ts ...
 */

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [, , email, password, displayName] = process.argv;

if (!email || !password) {
  console.error(
    "Usage: npx tsx scripts/create-admin.ts <email> <password> [displayName]"
  );
  process.exit(1);
}

// Initialize admin SDK
if (getApps().length === 0) {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (emulatorHost) {
    // Against emulator — no credentials needed
    console.log(`Using Firebase Emulator at ${emulatorHost}`);
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-spx-core" });
  } else {
    // Against production
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.error(
        "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\nor FIREBASE_AUTH_EMULATOR_HOST for emulator"
      );
      process.exit(1);
    }
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
    });
  }
}

const auth = getAuth();
const db = getFirestore();

async function main() {
  // Create Auth user
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: displayName || email,
  });

  console.log(`Created Auth user: ${userRecord.uid}`);

  // Set custom claim
  await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });
  console.log("Set custom claim: role=admin");

  // Create Firestore document
  await db.collection("users").doc(userRecord.uid).set({
    email,
    displayName: displayName || email,
    role: "admin",
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userRecord.uid,
  });

  console.log("Created users document in Firestore");
  console.log(`\nAdmin user created successfully: ${email}`);
}

main().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
