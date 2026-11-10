import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { lastMonths } from "@/lib/costs";
import { loadCostData } from "@/lib/cost-routes";
import { computeMrr } from "@/lib/mrr";
import { CostsPageClient } from "@/components/costs/costs-page-client";

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("admin", "member");
  const months = lastMonths(12);
  const { month } = await searchParams;
  const selectedMonth = month && months.includes(month) ? month : months[months.length - 1];

  const [data, subsSnap] = await Promise.all([
    loadCostData(months[0]),
    getAdminFirestore().collection("subscriptions").where("status", "==", "active").get(),
  ]);

  return (
    <CostsPageClient
      {...data}
      months={months}
      selectedMonth={selectedMonth}
      mrr={computeMrr(subsSnap.docs)}
    />
  );
}
