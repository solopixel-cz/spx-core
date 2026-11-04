import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { clientOptions, domainFromDoc } from "@/lib/domains";
import { DomainsPageClient } from "@/components/domains/domains-page-client";

export default async function DomainsPage() {
  await requireRole("admin", "member");
  const db = getAdminFirestore();

  const [domainsSnap, clients] = await Promise.all([
    db.collection("domains").get(),
    clientOptions(db),
  ]);

  const clientNames = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  // Domény archivovaných klientů do přehledu nepatří (clientOptions je vynechává).
  const domains = domainsSnap.docs
    .map(domainFromDoc)
    .filter((d) => !d.clientId || clientNames[d.clientId])
    .map((d) => ({ ...d, clientName: d.clientId ? clientNames[d.clientId] : null }));

  return <DomainsPageClient domains={domains} clients={clients} />;
}
