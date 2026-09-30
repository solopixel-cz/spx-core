import { requireRole } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { NewListForm } from "@/components/email-marketing/new-list-form";

export default async function NewListPage() {
  await requireRole("admin", "member");
  return (
    <FormPage
      backHref="/email-marketing?tab=lists"
      breadcrumbs={[
        { label: "Email marketing", href: "/email-marketing?tab=lists" },
        { label: "Nový seznam" },
      ]}
      title="Nový seznam"
      description="Po vytvoření do seznamu přidáte kontakty."
    >
      <NewListForm />
    </FormPage>
  );
}
