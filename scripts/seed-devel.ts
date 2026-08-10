/**
 * Naplní DEV Firestore databázi testovacími daty (idempotentně — pevná ID).
 *
 * BEZPEČNOST: spustí se JEN když je nastaveno NEXT_PUBLIC_FIRESTORE_DATABASE_ID
 * (tj. míří na pojmenovanou dev databázi). Bez toho se odmítne (ochrana prod).
 *
 * Spuštění:
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-devel.ts
 */
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
if (!dbId) {
  console.error(
    "❌ Seed jde jen do pojmenované dev databáze. Nastav NEXT_PUBLIC_FIRESTORE_DATABASE_ID (např. devel) v .env.local."
  );
  process.exit(1);
}

function db() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Chybí FIREBASE_* údaje (načti .env.local).");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount) });
  }
  return getFirestore(dbId!);
}

const now = new Date();
const inDays = (n: number) => new Date(now.getTime() + n * 86400000);
const ts = () => FieldValue.serverTimestamp();
const base = () => ({ createdAt: ts(), updatedAt: ts(), createdBy: "seed" });

async function main() {
  const store = db();
  console.log(`Seeduji dev databázi "${dbId}"…`);

  // Klienti
  await store.collection("clients").doc("seed-client-1").set({
    name: "Testovací Klient s.r.o.",
    email: "klient1@example.com",
    phone: "+420601111111",
    status: "active",
    salesOwnerUid: null,
    ...base(),
  });
  await store.collection("clients").doc("seed-client-2").set({
    name: "Ukázka Poradce",
    email: "klient2@example.com",
    phone: "+420602222222",
    status: "onboarding",
    salesOwnerUid: null,
    ...base(),
  });

  // Předplatné (nextInvoiceAt v budoucnu, ať cron nefakturuje hned)
  await store.collection("subscriptions").doc("seed-sub-1").set({
    clientId: "seed-client-1",
    plan: "pro",
    priceMonthly: 490,
    billingCycle: "monthly",
    status: "active",
    startedAt: inDays(-30),
    nextInvoiceAt: inDays(30),
    ...base(),
  });

  // Leady
  await store.collection("leads").doc("seed-lead-1").set({
    name: "Jan Nový",
    email: "jan.novy@example.com",
    phone: "+420603333333",
    source: "web",
    stage: "new",
    value: null,
    ownerUid: null,
    notes: "Testovací lead ze seedu.",
    ...base(),
  });
  await store.collection("leads").doc("seed-lead-2").set({
    name: "Petra Zájemce",
    email: "petra@example.com",
    phone: null,
    source: "referral",
    stage: "demo",
    value: 12000,
    ownerUid: null,
    notes: null,
    ...base(),
  });

  // Koncept faktury
  await store.collection("invoices").doc("seed-invoice-1").set({
    clientId: "seed-client-1",
    number: `${now.getFullYear()}-900`,
    amount: 490,
    items: [{ description: "Předplatné pro (měsíční)", quantity: 1, unitPrice: 490 }],
    variableSymbol: `${now.getFullYear()}900`,
    note: null,
    status: "draft",
    issuedAt: now,
    dueAt: inDays(14),
    ...base(),
  });

  console.log("✅ Hotovo: 2 klienti, 1 předplatné, 2 leady, 1 koncept faktury.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
