/**
 * Storno faktur automaticky vygenerovaných cronem (`createdBy == "system-cron"`).
 *
 * Bezpečnostní režim: bez `--execute` jen VYPÍŠE, co by stornoval (dry-run).
 * S `--execute` provede storno (status `cancelled` + reverzace pending provize).
 * Netýká se už zaplacených ani stornovaných faktur.
 *
 * Spuštění (env se načte ze .env.local):
 *   set -a && source .env.local && set +a && npx tsx scripts/cancel-cron-invoices.ts
 *   set -a && source .env.local && set +a && npx tsx scripts/cancel-cron-invoices.ts --execute
 */
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function db() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Chybí FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (načti .env.local)."
      );
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount) });
    console.log(`Projekt: ${projectId}`);
  }
  return getFirestore();
}

async function main() {
  const execute = process.argv.includes("--execute");
  const store = db();

  const snap = await store
    .collection("invoices")
    .where("createdBy", "==", "system-cron")
    .get();

  const target = snap.docs.filter((d) => {
    const s = d.data().status;
    return s !== "paid" && s !== "cancelled";
  });

  console.log(
    `Nalezeno ${snap.size} faktur od cronu, ke stornu ${target.length} (mimo paid/cancelled).`
  );
  for (const d of target) {
    const inv = d.data();
    console.log(
      ` - ${inv.number}  ${(inv.amount as number).toLocaleString("cs-CZ")} Kč  [${inv.status}]  ${d.id}`
    );
  }

  if (!execute) {
    console.log("\nDRY RUN — nic se nezměnilo. Pro provedení přidej --execute.");
    return;
  }

  console.log("\nProvádím storno…");
  for (const d of target) {
    const inv = d.data();
    await d.ref.update({ status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
    await store.collection("activity").add({
      entityType: "invoice",
      entityId: d.id,
      kind: "status_change",
      text: `Faktura ${inv.number} stornována (úklid cronu)`,
      actorUid: "system-cleanup",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "system-cleanup",
    });
    // Reverzace pending provize (paid provize u čerstvých cron faktur nevzniká).
    const commRef = store.collection("commissions").doc(d.id);
    const commDoc = await commRef.get();
    if (commDoc.exists && commDoc.data()!.status === "pending") {
      await commRef.update({ status: "reversed", updatedAt: FieldValue.serverTimestamp() });
    }
    console.log(` ✓ stornováno ${inv.number}`);
  }
  console.log(`Hotovo — stornováno ${target.length} faktur.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
