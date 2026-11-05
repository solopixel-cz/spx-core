import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { cnbRates } from "@/lib/cnb";
import { lastMonths, type CostDomain } from "@/lib/costs";
import { paymentFromDoc, serviceFromDoc } from "@/lib/cost-store";
import { computeMrr } from "@/lib/mrr";
import { CostsPageClient } from "@/components/costs/costs-page-client";

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("admin", "member");
  const db = getAdminFirestore();
  const months = lastMonths(12);
  const { month } = await searchParams;
  const selectedMonth = month && months.includes(month) ? month : months[months.length - 1];

  const [servicesSnap, paymentsSnap, domainsSnap, clientsSnap, subsSnap, { rates, approx }] = await Promise.all([
    db.collection("costServices").get(),
    db.collection("costPayments").where("month", ">=", months[0]).get(),
    db.collection("domains").get(),
    db.collection("clients").get(),
    db.collection("subscriptions").where("status", "==", "active").get(),
    cnbRates(),
  ]);

  const services = servicesSnap.docs.map(serviceFromDoc).sort((a, b) => a.name.localeCompare(b.name, "cs"));

  // Domény klientů i naše: platí se ročně v měsíci obnovení. Archivovaný klient = už neplatíme.
  const clients = new Map(clientsSnap.docs.map((d) => [d.id, d.data()]));
  const domains: CostDomain[] = domainsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const client = d.clientId ? clients.get(d.clientId as string) : null;
      if (typeof d.price !== "number" || d.price <= 0 || client?.deletedAt) return null;
      return {
        id: doc.id,
        name: d.name as string,
        clientName: (client?.name as string | undefined) ?? null,
        price: d.price,
        renewalAt: d.renewalAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .filter((d): d is CostDomain => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <CostsPageClient
      services={services}
      payments={paymentsSnap.docs.map(paymentFromDoc)}
      domains={domains}
      domainCount={domainsSnap.size}
      months={months}
      selectedMonth={selectedMonth}
      rates={rates}
      ratesApprox={approx}
      mrr={computeMrr(subsSnap.docs)}
    />
  );
}
