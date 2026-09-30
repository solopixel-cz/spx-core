import { requireRole } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { NewUserForm } from "@/components/settings/new-user-form";

export default async function NewUserPage() {
  // Uživatele zakládá jen admin (stejně jako API).
  await requireRole("admin");
  return (
    <FormPage
      backHref="/settings/users"
      breadcrumbs={[
        { label: "Nastavení", href: "/settings" },
        { label: "Uživatelé", href: "/settings/users" },
        { label: "Nový uživatel" },
      ]}
      title="Nový uživatel"
    >
      <NewUserForm />
    </FormPage>
  );
}
