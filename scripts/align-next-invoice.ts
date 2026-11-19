/**
 * Srovná příští fakturaci předplatných (`nextInvoiceAt`) podle skutečně
 * vystavených faktur. Do 1.49.0 ručně vystavená faktura datum neposouvala
 * (posouval ho jen vypnutý fakturační cron), takže v kalendáři svítí staré
 * „Vystavit fakturu“ jako po termínu.
 *
 * U předplatného s příští fakturací v minulosti najde poslední vystavenou
 * fakturu (z předplatného, jinak klienta s jediným předplatným), určí období,
 * které pokryla (fakturační den nejblíž datu vystavení, takže se počítá i
 * faktura vystavená pár dní před nebo po), a nastaví příští fakturaci na
 * období po něm. Faktuře z předplatného doplní `billingPeriodAt`. Nikdy datum neposune dozadu.
 *
 * Bezpečnostní režim: bez `--execute` jen VYPÍŠE plán (dry-run).
 *
 * Spuštění (env se načte ze .env.local):
 *   set -a && source .env.local && set +a && npx tsx scripts/align-next-invoice.ts
 *   set -a && source .env.local && set +a && npx tsx scripts/align-next-invoice.ts --execute
 */
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { billingAnchor, daysBetween, nextCycleDay, pragueDay, pragueMidnight } from "../lib/calendar";

function db() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Chybí FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (načti .env.local).");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount) });
    console.log(`Projekt: ${projectId}`);
  }
  return getFirestore();
}

const toDate = (v: unknown): Date | undefined => (v as { toDate?: () => Date } | null | undefined)?.toDate?.();
const cz = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
};

/**
 * Začátek období, které pokrývá faktura vystavená `issuedDay`: fakturační den
 * (od `startDay` po cyklech) nejblíž datu vystavení, při shodě ten dřívější.
 */
export function coveredPeriod(startDay: string, issuedDay: string, cycle: string | undefined, anchor: number): string | null {
  let day = startDay;
  for (let i = 0; i < 1000; i++) {
    const next = nextCycleDay(day, cycle, anchor);
    if (next > issuedDay) {
      if (day > issuedDay) return daysBetween(issuedDay, day) <= 31 ? day : null;
      return daysBetween(day, issuedDay) <= daysBetween(issuedDay, next) ? day : next;
    }
    day = next;
  }
  return day;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const store = db();
  const today = pragueDay(new Date());

  const [subsSnap, invoicesSnap, clientsSnap] = await Promise.all([
    store.collection("subscriptions").get(),
    store.collection("invoices").get(),
    store.collection("clients").get(),
  ]);
  const clients = new Map(clientsSnap.docs.filter((d) => !d.data().deletedAt).map((d) => [d.id, d.data().name as string]));
  const billable = subsSnap.docs.filter((d) => {
    const s = d.data();
    return ["active", "past_due", "trial"].includes(s.status) && !s.internal && (s.priceMonthly ?? 0) > 0 && clients.has(s.clientId);
  });
  const issued = invoicesSnap.docs.filter((d) => !["draft", "cancelled"].includes(d.data().status) && toDate(d.data().issuedAt));
  const latest = (docs: typeof issued) => docs.sort((a, b) => toDate(b.data().issuedAt)!.getTime() - toDate(a.data().issuedAt)!.getTime())[0];

  const plan: { sub: (typeof billable)[number]; invoice: (typeof issued)[number]; from: string; to: string; period: string; note: string }[] = [];
  const skipped: string[] = [];

  for (const sub of billable) {
    const s = sub.data();
    const current = toDate(s.nextInvoiceAt);
    const name = `${clients.get(s.clientId)} (${s.plan ?? s.label ?? s.service ?? "předplatné"}, ${s.billingCycle === "yearly" ? "ročně" : "měsíčně"})`;
    if (!current) {
      skipped.push(`${name}: nemá příští fakturaci`);
      continue;
    }
    const from = pragueDay(current);
    if (from >= today) continue;

    let invoice = latest(issued.filter((d) => d.data().subscriptionId === sub.id));
    let source = "faktura z předplatného";
    if (!invoice && billable.filter((b) => b.data().clientId === s.clientId).length === 1) {
      invoice = latest(issued.filter((d) => d.data().clientId === s.clientId && !d.data().projectId));
      source = "poslední faktura klienta";
    }
    if (!invoice) {
      skipped.push(`${name}: příští fakturace ${cz(from)}, ale žádná vystavená faktura, nechávám (opravdu nevyfakturováno?)`);
      continue;
    }

    const inv = invoice.data();
    const anchor = billingAnchor(toDate(s.startedAt), current);
    const startDay = pragueDay(toDate(s.startedAt) ?? current);
    const period = toDate(inv.billingPeriodAt)
      ? pragueDay(toDate(inv.billingPeriodAt)!)
      : coveredPeriod(startDay, pragueDay(toDate(inv.issuedAt)!), s.billingCycle, anchor);
    if (!period) {
      skipped.push(`${name}: faktura ${inv.number} je starší než začátek předplatného, nechávám`);
      continue;
    }
    const to = nextCycleDay(period, s.billingCycle, anchor);
    if (to <= from) {
      skipped.push(`${name}: poslední faktura ${inv.number} (${cz(pragueDay(toDate(inv.issuedAt)!))}) nepokrývá období od ${cz(from)}, nechávám`);
      continue;
    }
    plan.push({
      sub,
      invoice,
      from,
      to,
      period,
      note: `${source} ${inv.number} z ${cz(pragueDay(toDate(inv.issuedAt)!))}, období od ${cz(period)}${to < today ? ", STÁLE PO TERMÍNU" : ""}`,
    });
    console.log(` - ${name}: ${cz(from)} → ${cz(to)}  (${plan.at(-1)!.note})`);
  }

  console.log(`\nPosunout: ${plan.length}, ponechat: ${skipped.length}`);
  for (const line of skipped) console.log(` · ${line}`);

  if (!execute) {
    console.log("\nDRY RUN: nic se nezměnilo. Pro provedení přidej --execute.");
    return;
  }

  console.log("\nZapisuji…");
  for (const p of plan) {
    await p.sub.ref.update({ nextInvoiceAt: pragueMidnight(p.to), updatedAt: FieldValue.serverTimestamp() });
    if (p.invoice.data().subscriptionId === p.sub.id && !p.invoice.data().billingPeriodAt) {
      await p.invoice.ref.update({ billingPeriodAt: pragueMidnight(p.period), updatedAt: FieldValue.serverTimestamp() });
    }
    await store.collection("activity").add({
      entityType: "client",
      entityId: p.sub.data().clientId,
      kind: "system",
      text: `Příští fakturace srovnána podle faktur: ${cz(p.from)} → ${cz(p.to)}`,
      actorUid: "system-cleanup",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "system-cleanup",
    });
    console.log(` ✓ ${clients.get(p.sub.data().clientId)}: ${cz(p.to)}`);
  }
  console.log(`Hotovo, posunuto ${plan.length} předplatných.`);
}

if (process.argv[1]?.endsWith("align-next-invoice.ts")) {
  main().then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    }
  );
}
