"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Download, ExternalLink, Loader2, MoreHorizontal, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { outreachEmailStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export const invoiceStatusLabels: Record<string, string> = {
  draft: "Koncept",
  sent: "Odesláno",
  paid: "Zaplaceno",
  overdue: "Po splatnosti",
  cancelled: "Stornováno",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("cs-CZ") : "—";
}

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString("cs-CZ")} Kč`;
}

function daysLabel(n: number): string {
  return n === 1 ? "1 den" : n >= 2 && n <= 4 ? `${n} dny` : `${n} dní`;
}

/** Faktura je otevřená, dokud není zaplacená, stornovaná ani koncept. */
export function isOpenInvoice(status: string): boolean {
  return status === "sent" || status === "overdue";
}

/** Odznak stavu, pod ním drobně stav posledního e-mailu (pokud je). */
export function InvoiceStatusCell({ status, emailStatus }: { status: string; emailStatus?: string | null }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={statusVariants[status] ?? "secondary"}>{invoiceStatusLabels[status] ?? status}</Badge>
      {emailStatus && (
        <StatusBadge map={outreachEmailStatus} value={emailStatus} className="px-1.5 py-0 text-[11px] font-normal" />
      )}
    </div>
  );
}

/** Datum splatnosti; u otevřené faktury s kontextem „za X dní" / „X dní po splatnosti". */
export function InvoiceDueCell({ dueAt, status }: { dueAt: string | null; status: string }) {
  if (!dueAt) return <span className="text-muted-foreground">—</span>;
  let hint: React.ReactNode = null;
  if (isOpenInvoice(status)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueAt);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / DAY_MS);
    hint =
      diff < 0 ? (
        <span className="font-medium text-destructive">{daysLabel(-diff)} po splatnosti</span>
      ) : diff === 0 ? (
        <span className="font-medium text-amber-600 dark:text-amber-400">splatná dnes</span>
      ) : (
        <span className="text-muted-foreground">za {daysLabel(diff)}</span>
      );
  }
  return (
    <div className="flex flex-col">
      <span className="tabular-nums">{formatDate(dueAt)}</span>
      {hint && <span className="text-xs">{hint}</span>}
    </div>
  );
}

export { formatDate as formatInvoiceDate };

/** Levý červený pruh pro řádek po splatnosti. */
export function overdueRowClass(status: string): string | undefined {
  return status === "overdue" ? "shadow-[inset_3px_0_0_var(--destructive)]" : undefined;
}

/**
 * Akce faktury: jedna hlavní akce podle stavu jako tlačítko s textem
 * (koncept → Odeslat, otevřená → Zaplaceno), zbytek v menu „⋯".
 * Storno se potvrzuje přímo na místě, bez modálu.
 */
export function InvoiceActions({
  invoice,
  className,
}: {
  invoice: { id: string; status: string; emailStatus?: string | null };
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "send" | "paid" | "cancelled">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { id, status } = invoice;
  const open = isOpenInvoice(status);
  const canSend = status !== "paid" && status !== "cancelled";
  const alreadySent = Boolean(invoice.emailStatus) || status !== "draft";

  async function send() {
    setBusy("send");
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Faktura odeslána klientovi");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Odeslání se nezdařilo");
    } finally {
      setBusy(null);
    }
  }

  async function act(action: "paid" | "cancelled") {
    setBusy(action);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "paid" ? "Faktura zaplacena" : "Faktura stornována");
      router.refresh();
    } catch {
      toast.error("Akce se nezdařila");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  }

  if (confirmCancel) {
    return (
      <div className={cn("flex items-center justify-end gap-1.5", className)} data-no-row-nav>
        <span className="text-xs text-muted-foreground">Stornovat?</span>
        <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => act("cancelled")}>
          {busy === "cancelled" && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Potvrdit
        </Button>
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setConfirmCancel(false)}>
          Zrušit
        </Button>
      </div>
    );
  }

  const spinner = <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />;

  return (
    <div className={cn("flex items-center justify-end gap-1", className)} data-no-row-nav>
      {status === "draft" && (
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={send}>
          {busy === "send" ? spinner : <Send className="mr-1 h-3.5 w-3.5" />}
          Odeslat
        </Button>
      )}
      {open && (
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act("paid")}>
          {busy === "paid" ? spinner : <Check className="mr-1 h-3.5 w-3.5" />}
          Zaplaceno
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Další akce" disabled={busy !== null}>
              {busy === "send" && status !== "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {canSend && alreadySent && (
            <DropdownMenuItem onClick={send}>
              <Send /> Odeslat znovu
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => window.open(`/api/invoices/${id}/pdf`, "_blank", "noopener")}>
            <Download /> Stáhnout PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/invoices/${id}`)}>
            <ExternalLink /> Otevřít detail
          </DropdownMenuItem>
          {open && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmCancel(true)}>
                <X /> Stornovat
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
