import { getAdminFirestore } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/auth";

export interface AttentionItem {
  type: "invoice" | "ticket" | "lead" | "submission" | "task";
  severity: "high" | "medium" | "low";
  title: string;
  age: number; // days
  href: string;
}

const DAY_MS = 86400000;

export async function getAttentionItems(
  uid: string,
  role: UserRole
): Promise<AttentionItem[]> {
  const db = getAdminFirestore();
  const now = Date.now();
  const items: AttentionItem[] = [];

  const isSales = role === "sales";

  const fetches: Promise<void>[] = [];

  // 1. Overdue invoices (not for sales)
  if (!isSales) {
    fetches.push(
      db
        .collection("invoices")
        .where("status", "==", "sent")
        .get()
        .then((snap) => {
          snap.docs.forEach((doc) => {
            const dueAt = doc.data().dueAt?.toDate?.();
            if (!dueAt || dueAt >= new Date()) return;
            const age = Math.floor((now - dueAt.getTime()) / DAY_MS);
            items.push({
              type: "invoice",
              severity: age > 14 ? "high" : "medium",
              title: `Faktura ${doc.data().number} po splatnosti (${age} dní)`,
              age,
              href: "/fakturace",
            });
          });
        })
    );
  }

  // 2. Urgent/high tickets without assignee or stale 7+ days
  fetches.push(
    db
      .collection("tickets")
      .where("status", "in", ["open", "in_progress"])
      .get()
      .then((snap) => {
        snap.docs.forEach((doc) => {
          const d = doc.data();
          const priority = d.priority as string;
          const updatedAt = d.updatedAt?.toDate?.() ?? d.createdAt?.toDate?.();
          const age = updatedAt ? Math.floor((now - updatedAt.getTime()) / DAY_MS) : 0;

          if (
            (priority === "urgent" || priority === "high") &&
            (!d.assigneeUid || age >= 7)
          ) {
            items.push({
              type: "ticket",
              severity: priority === "urgent" ? "high" : "medium",
              title: `Ticket „${d.title}" — ${!d.assigneeUid ? "bez řešitele" : `bez změny ${age} dní`}`,
              age,
              href: "/tickety",
            });
          }
        });
      })
  );

  // 3. Stagnating leads (14+ days without update in active stages)
  fetches.push(
    db
      .collection("leads")
      .get()
      .then((snap) => {
        const activeStages = ["contacted", "demo", "offer", "contract"];
        snap.docs.forEach((doc) => {
          const d = doc.data();
          if (!activeStages.includes(d.stage)) return;
          if (isSales && d.ownerUid !== uid) return;
          const updatedAt = d.updatedAt?.toDate?.();
          if (!updatedAt) return;
          const age = Math.floor((now - updatedAt.getTime()) / DAY_MS);
          if (age >= 14) {
            items.push({
              type: "lead",
              severity: age > 30 ? "high" : "medium",
              title: `Lead „${d.name}" stagnuje ${age} dní`,
              age,
              href: "/leady",
            });
          }
        });
      })
  );

  // 4. Unprocessed submissions older than 3 days
  fetches.push(
    db
      .collection("card-submissions")
      .get()
      .then((snap) => {
        snap.docs.forEach((doc) => {
          const d = doc.data();
          if (d.processedAt) return;
          const createdAt = d.createdAt?.toDate?.();
          if (!createdAt) return;
          const age = Math.floor((now - createdAt.getTime()) / DAY_MS);
          if (age >= 3) {
            items.push({
              type: "submission",
              severity: age > 7 ? "high" : "low",
              title: `Podklady „${d.fullName}" čekají ${age} dní`,
              age,
              href: "/podklady",
            });
          }
        });
      })
  );

  // 5. Overdue onboarding tasks
  fetches.push(
    db
      .collection("tasks")
      .where("status", "==", "open")
      .get()
      .then((snap) => {
        snap.docs.forEach((doc) => {
          const d = doc.data();
          if (isSales && d.assigneeUid !== uid) return;
          const dueAt = d.dueAt?.toDate?.();
          if (!dueAt || dueAt >= new Date()) return;
          if (!d.checklistTemplateId) return; // only onboarding tasks
          const age = Math.floor((now - dueAt.getTime()) / DAY_MS);
          items.push({
            type: "task",
            severity: age > 7 ? "high" : "medium",
            title: `Onboarding úkol „${d.title}" po termínu (${age} dní)`,
            age,
            href: "/ukoly",
          });
        });
      })
  );

  await Promise.all(fetches);

  // Sort by severity (high first), then by age (oldest first)
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  items.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2) ||
      b.age - a.age
  );

  return items;
}
