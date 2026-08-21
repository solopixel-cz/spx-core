import { requireRole } from "@/lib/auth";

export default async function NastaveniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin", "member");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nastavení</h1>
      {children}
    </div>
  );
}
