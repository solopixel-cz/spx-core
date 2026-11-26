import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { feedbackFromDoc } from "@/lib/web-feedback";
import { WebFeedbackPageClient } from "@/components/web-feedback/web-feedback-page-client";

/** Zpětná vazba z dotazu při odchodu z webu (`webFeedback`), posledních 500 odpovědí. */
export default async function WebFeedbackPage() {
  await requireRole("admin", "member");
  const db = getAdminFirestore();
  const snap = await db.collection("webFeedback").orderBy("createdAt", "desc").limit(500).get();
  return <WebFeedbackPageClient rows={snap.docs.map(feedbackFromDoc)} />;
}
