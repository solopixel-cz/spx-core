import { FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * Vygeneruje onboarding úkoly nového klienta ze šablony `templates/onboarding`
 * (Nastavení → Onboarding): jeden úkol na krok, termín = dnes + `offsetDays`.
 * Chybějící / prázdná šablona = nic. Vrací počet vytvořených úkolů.
 */
export async function createOnboardingTasks(
  db: Firestore,
  { clientId, assigneeUid, actorUid }: { clientId: string; assigneeUid: string; actorUid: string }
): Promise<number> {
  const templateSnap = await db.collection("templates").doc("onboarding").get();
  const steps = templateSnap.data()?.steps as
    | Array<{ title: string; offsetDays: number }>
    | undefined;
  if (!steps?.length) return 0;

  const now = new Date();
  const batch = db.batch();
  for (const step of steps) {
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + (step.offsetDays ?? 0));
    batch.set(db.collection("tasks").doc(), {
      title: step.title,
      clientId,
      assigneeUid,
      dueAt,
      status: "open",
      checklistTemplateId: "onboarding",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: actorUid,
    });
  }
  await batch.commit();
  return steps.length;
}
