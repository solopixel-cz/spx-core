import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FormPage } from "@/components/form-page";
import { CsvImport } from "@/components/prospects/csv-import";

export default async function ProspectImportPage() {
  const user = await requireAuth();
  // Import smí jen admin/member (stejně jako API).
  if (user.role === "sales") redirect("/prospects");

  const usersSnap = await getAdminFirestore().collection("users").get();
  const users = usersSnap.docs.map((d) => ({
    id: d.id,
    displayName: d.data().displayName as string,
    email: d.data().email as string,
  }));

  return (
    <FormPage
      backHref="/prospects"
      breadcrumbs={[{ label: "Oslovení", href: "/prospects" }, { label: "CSV import" }]}
      title="CSV import kontaktů"
      description="Nahrajte CSV, zkontrolujte mapování sloupců a spusťte import. Duplicity se přeskočí."
      wide
    >
      <CsvImport users={users} />
    </FormPage>
  );
}
