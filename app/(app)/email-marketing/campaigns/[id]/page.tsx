import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { statusOrder } from "@/lib/schemas/email-status";
import { BackButton } from "@/components/back-button";
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

  const stats = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
  const recipients = emailsSnap.docs.map((e) => {
    const ed = e.data();
    const status = ed.status as string;
    const order = statusOrder[status] ?? 0;
    stats.sent++;
    if (order >= statusOrder.delivered && order <= statusOrder.clicked) stats.delivered++;
    if (order >= statusOrder.opened && order <= statusOrder.clicked) stats.opened++;
    if (order === statusOrder.clicked) stats.clicked++;
    if (status === "bounced") stats.bounced++;
    return {
      id: e.id,
      toEmail: ed.toEmail as string,
      status,
      lastEventAt: serializeTimestamp(ed.lastEventAt),
    };
  });
  recipients.sort((a, b) => a.toEmail.localeCompare(b.toEmail));

  const name = d.name as string;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Email marketing", href: "/email-marketing" }, { label: name }]}
      />

      <div className="flex items-center gap-3">
        <BackButton href="/email-marketing" className="shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {[d.templateName, d.listName].filter(Boolean).join(" → ")}
            {d.sentAt ? ` · odesláno ${formatDateTime(serializeTimestamp(d.sentAt))}` : ""}
          </p>
        </div>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Odesláno" value={stats.sent} />
        <StatTile label="Doručeno" value={stats.delivered} />
        <StatTile label="Otevřeno" value={stats.opened} />
        <StatTile label="Prokliky" value={stats.clicked} />
        <StatTile label="Bounce" value={stats.bounced} />
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
