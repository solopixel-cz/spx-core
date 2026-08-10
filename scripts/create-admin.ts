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
const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(dbId) : getFirestore();

async function main() {
  // Auth je sdílený napříč databázemi — když účet už existuje, znovupoužij ho
  // (užitečné při bootstrapu users dokumentu do dev databáze).
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email,
    });
    console.log(`Created Auth user: ${userRecord.uid}`);
  } catch (err) {
    if ((err as { code?: string })?.code === "auth/email-already-exists") {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Auth účet už existuje, používám: ${userRecord.uid} (heslo se nemění)`);
    } else {
      throw err;
    }
  }

  // Set custom claim
  await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });
  console.log("Set custom claim: role=admin");

  // Create Firestore document (merge — neklobrcuje případná existující pole)
  await db.collection("users").doc(userRecord.uid).set(
    {
      email,
      displayName: displayName || email,
      role: "admin",
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: userRecord.uid,
    },
    { merge: true }
  );

  console.log(`Users document zapsán do databáze "${dbId ?? "(default)"}"`);
  console.log(`\nAdmin připraven: ${email}`);
}

main().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
