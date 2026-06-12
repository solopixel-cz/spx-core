import { requireAuth } from "@/lib/auth";
import { SubmissionsPageClient } from "@/components/submissions/submissions-page-client";

export default async function PodkladyPage() {
  await requireAuth();
  return <SubmissionsPageClient />;
}
