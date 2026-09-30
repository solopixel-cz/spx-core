import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Crumb } from "@/components/breadcrumbs";

/**
 * Načtení klienta pro vnořenou routu (`/clients/[id]/...`) se stejným guardem
 * jako detail: sales vidí jen vlastní klienty. `tab` = záložka detailu, na
 * kterou vede návrat.
 */
export async function loadClientForRoute(id: string, tab?: string) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const doc = await db.collection("clients").doc(id).get();
  if (!doc.exists) notFound();
  const data = doc.data()!;
  if (user.role === "sales" && data.salesOwnerUid !== user.uid) notFound();

  const name = data.name as string;
  const detailHref = `/clients/${id}`;
  const backHref = tab ? `${detailHref}?tab=${tab}` : detailHref;

  return {
    user,
    db,
    data,
    name,
    backHref,
    crumbs: (label: string): Crumb[] => [
      { label: "Klienti", href: "/clients" },
      { label: name, href: backHref },
      { label },
    ],
  };
}
