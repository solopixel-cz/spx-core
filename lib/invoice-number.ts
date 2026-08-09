/**
 * Vygeneruje pořadové číslo faktury `RRRR-NNN` transakcí nad `counters/invoices`.
 * Sekvence se resetuje při změně roku. Sdílené mezi ručním vystavením
 * (route handler) a automatickým generováním z předplatného (cron).
 */
export async function generateInvoiceNumber(
  db: FirebaseFirestore.Firestore,
  year = new Date().getFullYear()
): Promise<string> {
  const counterRef = db.collection("counters").doc("invoices");
  return db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    let seq = 1;
    if (counterDoc.exists) {
      const counterData = counterDoc.data()!;
      if (counterData.year === year) {
        seq = (counterData.seq || 0) + 1;
      }
    }
    tx.set(counterRef, { year, seq });
    return `${year}-${String(seq).padStart(3, "0")}`;
  });
}
