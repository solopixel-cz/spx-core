import { requireRole } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { InvoiceExport } from "@/components/invoices/invoice-export";

export default async function InvoiceExportPage() {
  await requireRole("admin", "member");
  return (
    <FormPage
      backHref="/invoices"
      breadcrumbs={[{ label: "Faktury", href: "/invoices" }, { label: "Export" }]}
      title="Export faktur pro účetní"
      description="CSV se seznamem faktur za zvolené období (podle data vystavení). Otevře se v Excelu s diakritikou."
    >
      <InvoiceExport />
    </FormPage>
  );
}
