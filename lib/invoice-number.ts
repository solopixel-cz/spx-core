/**
 * Vygeneruje pořadové číslo faktury `RRRR-NNNN` transakcí nad `counters/invoices`.
 *
 * CRM není jediný zdroj fakturace, proto má vlastní číselnou řadu ve vlastním
 * bloku (start 7001) — zřetelně odlišnou od běžné řady od 0001. První faktura
 * roku 2026 = `2026-7001` (VS `20267001`). Sekvence se resetuje při změně roku.
 *
 * `counters/invoices` drží syrové pořadí `seq` (1, 2, 3, …); blok se přičítá až
 * při formátování, takže start bloku jde měnit bez migrace counteru.
 *
 * Sdílené mezi ručním vystavením (route handler) a automatickým generováním
 * z předplatného (cron).
 */

/** Start číselného bloku CRM řady — první faktura roku = START_OFFSET + 1. */
export const INVOICE_NUMBER_BLOCK_START = 7000;

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
    const ordinal = INVOICE_NUMBER_BLOCK_START + seq;
    return `${year}-${String(ordinal).padStart(4, "0")}`;
  });
}
