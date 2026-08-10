"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Send, Pencil, Loader2, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { invoiceStatus, outreachEmailStatus } from "@/lib/status";
import { invoiceLineTotal } from "@/lib/schemas/invoice";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

interface InvoiceDetail {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  number: string;
  amount: number;
  items: InvoiceItem[] | null;
  variableSymbol: string | null;
  note: string | null;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
}

interface EmailRow {
  id: string;
  status: string;
  toEmail: string;
  sentAtIso: string | null;
}

interface ActivityRow {
  id: string;
  kind: string;
  text: string;
  createdAt: string | null;
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("cs-CZ") : "—";
}

function fmtDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("cs-CZ") : "—";
}

export function InvoiceDetailClient({
  invoice,
  emails,
  activities,
  isAdmin,
}: {
  invoice: InvoiceDetail;
  emails: EmailRow[];
  activities: ActivityRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function handleDelete() {
    if (deleteConfirm !== invoice.number) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Faktura smazána");
      router.push("/fakturace");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Smazání se nezdařilo");
      setBusy(null);
    }
  }

  const canSend = invoice.status !== "paid" && invoice.status !== "cancelled";
  const canSettle =
    invoice.status === "sent" || invoice.status === "overdue";
  const isDraft = invoice.status === "draft";

  async function action(kind: "send" | "paid" | "cancelled") {
    setBusy(kind);
    try {
      const res =
        kind === "send"
          ? await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" })
          : await fetch(`/api/invoices/${invoice.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: kind }),
            });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(
        kind === "send"
          ? "Faktura odeslána"
          : kind === "paid"
            ? "Faktura zaplacena"
            : "Faktura stornována"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Akce se nezdařila");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/fakturace" />}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold">{invoice.number}</h1>
              <StatusBadge map={invoiceStatus} value={invoice.status} />
            </div>
            <Link
              href={`/klienti/${invoice.clientId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {invoice.clientName}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <FileText className="mr-1 h-4 w-4" />
              Stáhnout PDF
            </Button>
          )}
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/fakturace/${invoice.id}/upravit`} />}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Upravit
            </Button>
          )}
          {canSend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => action("send")}
              disabled={busy === "send"}
            >
              {busy === "send" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              {emails.length > 0 ? "Odeslat znovu" : "Odeslat"}
            </Button>
          )}
          {canSettle && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => action("paid")}
                disabled={busy === "paid"}
              >
                {busy === "paid" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Zaplaceno
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => action("cancelled")}
                disabled={busy === "cancelled"}
              >
                <X className="mr-1 h-4 w-4" />
                Stornovat
              </Button>
            </>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Smazat
            </Button>
          )}
        </div>
      </div>

      {/* Potvrzení smazání */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat fakturu {invoice.number}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Trvale smaže fakturu i navázané e-maily a provizi. Tuto akci nelze
              vzít zpět a vznikne mezera v číselné řadě. Pro storno (zachování
              dokladu) použij tlačítko Stornovat.
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Pro potvrzení opiš číslo faktury <strong>{invoice.number}</strong>
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={invoice.number}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== invoice.number || busy === "delete"}
            >
              {busy === "delete" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Smazat trvale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta dlaždice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Částka", value: `${invoice.amount.toLocaleString("cs-CZ")} Kč` },
          { label: "Vystaveno", value: fmt(invoice.issuedAt) },
          { label: "Splatnost", value: fmt(invoice.dueAt) },
          { label: "Variabilní symbol", value: invoice.variableSymbol ?? "—" },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="mt-1 font-medium">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Položky */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Položky</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Popis</TableHead>
                  <TableHead className="w-16 text-right">Ks</TableHead>
                  <TableHead className="w-32 text-right">Cena/ks</TableHead>
                  <TableHead className="w-16 text-right">Sleva</TableHead>
                  <TableHead className="w-32 text-right">Celkem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.unitPrice.toLocaleString("cs-CZ")} Kč
                    </TableCell>
                    <TableCell className="text-right">
                      {item.discountPercent ? `${item.discountPercent} %` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoiceLineTotal(item).toLocaleString("cs-CZ")} Kč
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Celkem
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {invoice.amount.toLocaleString("cs-CZ")} Kč
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {invoice.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Poznámka</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{invoice.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Historie e-mailů */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Odeslané e-maily</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Faktura zatím nebyla odeslána.
            </p>
          ) : (
            <ul className="space-y-2">
              {emails.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {fmtDateTime(e.sentAtIso)} · {e.toEmail}
                  </span>
                  <StatusBadge map={outreachEmailStatus} value={e.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Aktivita */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historie</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné záznamy.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <div>
                    <p>{a.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
