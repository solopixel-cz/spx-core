import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { statusOrder } from "@/lib/schemas/email-status";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { outreachEmailStatus } from "@/lib/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { resolveCampaignTargets } from "@/lib/marketing/send-campaign";
import { CampaignResendButton } from "@/components/email-marketing/campaign-resend-button";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "member");
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("campaigns").doc(id).get();
  if (!doc.exists || doc.data()?.deletedAt) notFound();
  const d = doc.data()!;

  const emailsSnap = await db
    .collection("campaignEmails")
    .where("campaignId", "==", id)
    .get();

  const stats = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 };
  const recipients = emailsSnap.docs.map((e) => {
    const ed = e.data();
    const status = ed.status as string;
    const order = statusOrder[status] ?? 0;
    if (status === "failed") stats.failed++;
    else stats.sent++;
    if (order >= statusOrder.delivered && order <= statusOrder.clicked) stats.delivered++;
    if (order >= statusOrder.opened && order <= statusOrder.clicked) stats.opened++;
    if (order === statusOrder.clicked) stats.clicked++;
    if (status === "bounced") stats.bounced++;
    return {
      id: e.id,
      toEmail: ed.toEmail as string,
      status,
      error: (ed.error as string | undefined) ?? null,
      lastEventAt: serializeTimestamp(ed.lastEventAt),
    };
  });
  recipients.sort((a, b) => a.toEmail.localeCompare(b.toEmail));

  // Komu ze seznamu e-mail neodešel: neúspěšní a ti bez záznamu (starší kampaně
  // odeslané po 15 najednou, kde Resend část odmítl kvůli limitu a záznam nevznikl).
  const delivered = new Set(recipients.filter((r) => r.status !== "failed").map((r) => r.toEmail.toLowerCase()));
  const listDoc = d.listId ? await db.collection("marketingLists").doc(d.listId as string).get() : null;
  const pending =
    listDoc?.exists && !listDoc.data()?.deletedAt
      ? (await resolveCampaignTargets(db, listDoc.data()!)).targets.filter((t) => !delivered.has(t.email.toLowerCase()))
      : [];

  const name = d.name as string;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        backHref="/email-marketing"
        items={[{ label: "Email marketing", href: "/email-marketing" }, { label: name }]}
      />

      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {[d.templateName, d.listName].filter(Boolean).join(" → ")}
            {d.sentAt ? ` · odesláno ${formatDateTime(serializeTimestamp(d.sentAt))}` : ""}
          </p>
        </div>
      </div>

      {pending.length > 0 && d.status !== "sending" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-700 dark:bg-amber-950">
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {pending.length === 1 ? "1 člověku" : `${pending.length} lidem`} ze seznamu e-mail neodešel
            </p>
            <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">{pending.map((t) => t.name || t.email).join(", ")}</p>
          </div>
          <CampaignResendButton campaignId={id} count={pending.length} />
        </div>
      )}

      {/* Statistiky */}
      <div className={`grid grid-cols-2 gap-4 ${stats.failed > 0 ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}>
        <StatTile label="Odesláno" value={stats.sent} />
        <StatTile label="Doručeno" value={stats.delivered} />
        <StatTile label="Otevřeno" value={stats.opened} />
        <StatTile label="Prokliky" value={stats.clicked} />
        <StatTile label="Bounce" value={stats.bounced} />
        {stats.failed > 0 && <StatTile label="Neodesláno" value={stats.failed} />}
      </div>

      {/* Příjemci */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Poslední událost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Žádní příjemci
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.toEmail}</TableCell>
                  <TableCell>
                    <StatusBadge map={outreachEmailStatus} value={r.status} />
                    {r.error && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{r.error}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(r.lastEventAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
