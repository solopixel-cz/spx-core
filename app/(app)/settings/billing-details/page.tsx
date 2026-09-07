import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { BackButton } from "@/components/back-button";
import { CompanyForm } from "@/components/settings/company-form";
import type { CompanyData } from "@/lib/schemas/company";

export default async function FakturacniUdajePage() {
  await requireRole("admin");

  const db = getAdminFirestore();
  const doc = await db.collection("settings").doc("company").get();
  const initial = (doc.exists ? doc.data() : {}) as Partial<CompanyData>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-2">
        <BackButton href="/settings" className="-ml-2 shrink-0" />
        <div>
          <h1 className="font-heading text-2xl font-bold">Fakturační údaje</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Údaje dodavatele na fakturách — hlavička dokladu, platební údaje a QR
            platba. CRM je od teď jediná evidence faktur (bez Fakturoidu).
          </p>
        </div>
      </div>

      <CompanyForm initial={initial} />
    </div>
  );
}
