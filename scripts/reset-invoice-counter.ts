/**
 * Reset čítače číselné řady faktur (`counters/invoices`) na začátek roku.
 *
 * CRM používá vlastní blok od 7001 (viz lib/invoice-number.ts). Po přechodu na
 * nový formát `RRRR-NNNN` se čítač resetuje na `seq:0`, aby první ostrá faktura
 * roku byla přesně `RRRR-7001`. Staré faktury si svá čísla ponechají.
 *
 * Usage (nejdřív náhled, pak reset):
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/reset-invoice-counter.ts            # jen vypíše stav
 *   npx tsx scripts/reset-invoice-counter.ts --apply    # provede reset
 *   npx tsx scripts/reset-invoice-counter.ts --apply 2026
 */

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
const yearArg = process.argv.find((a) => /^\d{4}$/.test(a));
const year = yearArg ? Number(yearArg) : new Date().getFullYear();

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (source .env.local)"
    );
    process.exit(1);
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
  });
}

const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(dbId) : getFirestore();

async function main() {
  const ref = db.collection("counters").doc("invoices");
  const snap = await ref.get();
  console.log(
    `Aktuální counters/invoices: ${
      snap.exists ? JSON.stringify(snap.data()) : "(neexistuje)"
    }`
  );

  // Přehled existujících čísel faktur (kontrola kolize s novou řadou RRRR-7001+).
  const invSnap = await db.collection("invoices").get();
  const numbers = invSnap.docs
    .map((d) => d.data().number as string)
    .filter(Boolean)
    .sort();
  console.log(`Existujících faktur: ${numbers.length}`);
  if (numbers.length > 0) {
    console.log(`  Čísla: ${numbers.join(", ")}`);
    const collision = numbers.filter((n) => n === `${year}-7001`);
    if (collision.length > 0) {
      console.error(
        `POZOR: číslo ${year}-7001 už existuje — reset by způsobil kolizi. Přeruším.`
      );
      process.exit(1);
    }
  }

  if (!apply) {
    console.log(
      `\nNáhled. Po resetu bude další faktura roku ${year} = ${year}-7001.\n` +
        `Spusť s --apply pro provedení.`
    );
    return;
  }

  await ref.set({ year, seq: 0 });
  console.log(
    `\n✅ Reset hotový: counters/invoices = { year: ${year}, seq: 0 }. Další faktura = ${year}-7001.`
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
