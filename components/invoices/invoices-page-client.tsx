"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Check, X, Loader2, Send } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { StatusBadge } from "@/components/status-badge";
import { outreachEmailStatus } from "@/lib/status";
import { InvoiceExportDialog } from "@/components/invoices/invoice-export-dialog";

interface InvoiceRow {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
  emailStatus: string | null;
}

const statusLabels: Record<string, string> = {
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

export function InvoicesPageClient({
  invoices,
  stats,
}: {
  invoices: InvoiceRow[];
  stats: {
    overdueCount: number;
    overdueSum: number;
    issuedThisMonthSum: number;
    paidThisMonthSum: number;
  };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  async function handleSend(invoiceId: string) {
    setSendingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Faktura odeslána klientovi");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odeslání se nezdařilo");
    } finally {
      setSendingId(null);
    }
  }

  async function handleAction(invoiceId: string, action: "paid" | "cancelled") {
    setActingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
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
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Fakturace</h1>
        <div className="flex gap-2">
          <InvoiceExportDialog />
          <Button size="sm" nativeButton={false} render={<Link href="/fakturace/nova" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nová faktura
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Po splatnosti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {stats.overdueCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats.overdueSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vystaveno tento měsíc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.issuedThisMonthSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zaplaceno tento měsíc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats.paidThisMonthSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <FilterBar>
        <Select
          items={{ all: "Všechny", ...statusLabels }}
          value={filter}
          onValueChange={(val) => setFilter(val ?? "all")}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>Žádné faktury</EntityCardEmpty>
        ) : (
          filtered.map((inv) => (
            <EntityCard
              key={inv.id}
              title={
                <Link href={`/fakturace/${inv.id}`} className="font-mono text-sm font-medium hover:underline">
                  {inv.number}
                </Link>
              }
              badge={
                <Badge variant={statusVariants[inv.status] ?? "secondary"}>
                  {statusLabels[inv.status] ?? inv.status}
                </Badge>
              }
              subtitle={inv.clientName}
              meta={
                <>
                  <span className="font-medium text-foreground">
                    {inv.amount.toLocaleString("cs-CZ")} Kč
                  </span>
                  {inv.issuedAt && (
                    <span>
                      Vystaveno {new Date(inv.issuedAt).toLocaleDateString("cs-CZ")}
                    </span>
                  )}
                  {inv.dueAt && (
                    <span>
                      Splatnost {new Date(inv.dueAt).toLocaleDateString("cs-CZ")}
                    </span>
                  )}
                </>
              }
            >
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {inv.emailStatus && (
                  <StatusBadge map={outreachEmailStatus} value={inv.emailStatus} />
                )}
                {inv.status !== "paid" && inv.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(inv.id)}
                    disabled={sendingId === inv.id}
                  >
                    {sendingId === inv.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-3.5 w-3.5" />
                    )}
                    {inv.emailStatus ? "Odeslat znovu" : "Odeslat"}
                  </Button>
                )}
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative"
                      onClick={() => handleAction(inv.id, "paid")}
                      disabled={actingId === inv.id}
                    >
                      {actingId === inv.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      )}
                      Zaplaceno
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative"
                      onClick={() => handleAction(inv.id, "cancelled")}
                      disabled={actingId === inv.id}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Stornovat
                    </Button>
                  </>
                )}
              </div>
            </EntityCard>
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Částka</TableHead>
              <TableHead>Vystaveno</TableHead>
              <TableHead>Splatnost</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-28">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">Žádné faktury</TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">
                    <Link href={`/fakturace/${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.clientName}</TableCell>
                  <TableCell>{inv.amount.toLocaleString("cs-CZ")} Kč</TableCell>
                  <TableCell>{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("cs-CZ") : "—"}</TableCell>
                  <TableCell>{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("cs-CZ") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[inv.status] ?? "secondary"}>
                      {statusLabels[inv.status] ?? inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inv.emailStatus ? (
                      <StatusBadge map={outreachEmailStatus} value={inv.emailStatus} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSend(inv.id)}
                          title={inv.emailStatus ? "Odeslat znovu" : "Odeslat"}
                          disabled={sendingId === inv.id}
                        >
                          {sendingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleAction(inv.id, "paid")} title="Zaplaceno" disabled={actingId === inv.id}>
                            {actingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleAction(inv.id, "cancelled")} title="Stornovat" disabled={actingId === inv.id}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
