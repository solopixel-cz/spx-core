"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { Copy, CreditCard } from "lucide-react";

interface CommissionRow {
  id: string;
  invoiceId: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  salesUid: string;
  salesName: string;
  baseAmount: number;
  rate: number;
  amount: number;
  status: string;
  payoutNote: string | null;
  earnedAt: string | null;
  paidAt: string | null;
}

interface SalesUser {
  id: string;
  displayName: string;
  commissionRate?: number;
}

const statusLabels: Record<string, string> = {
  pending: "K vyplacení",
  paid: "Vyplaceno",
  reversed: "Stornováno",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  paid: "default",
  reversed: "destructive",
};

export function ProvizePageClient({
  commissions,
  salesUsers,
}: {
  commissions: CommissionRow[];
  salesUsers: SalesUser[];
}) {
  const router = useRouter();
  const [salesFilter, setSalesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutNote, setPayoutNote] = useState("");
  const [paying, setPaying] = useState(false);

  // Filter
  let filtered = commissions;
  if (salesFilter !== "all") {
    filtered = filtered.filter((c) => c.salesUid === salesFilter);
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }

  // Per-user summary
  const summaryMap = new Map<string, { name: string; rate?: number; pending: number; paidThisYear: number }>();
  const thisYear = new Date().getFullYear();

  for (const c of commissions) {
    if (!summaryMap.has(c.salesUid)) {
      const su = salesUsers.find((u) => u.id === c.salesUid);
      summaryMap.set(c.salesUid, {
        name: c.salesName,
        rate: su?.commissionRate,
        pending: 0,
        paidThisYear: 0,
      });
    }
    const s = summaryMap.get(c.salesUid)!;
    if (c.status === "pending") s.pending += c.amount;
    if (c.status === "paid" && c.paidAt && new Date(c.paidAt).getFullYear() === thisYear) {
      s.paidThisYear += c.amount;
    }
  }

  const pendingForSelection = filtered.filter((c) => c.status === "pending");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === pendingForSelection.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingForSelection.map((c) => c.id)));
    }
  }

  async function handlePayout() {
    if (selected.size === 0) return;
    setPaying(true);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionIds: [...selected],
          payoutNote: payoutNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.size} provizí označeno jako vyplacené`);
      setPayoutDialogOpen(false);
      setPayoutNote("");
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Nepodařilo se vyplatit provize");
    } finally {
      setPaying(false);
    }
  }

  function copyPodklad() {
    const items = pendingForSelection.filter((c) => selected.has(c.id));
    if (items.length === 0) return;
    const total = items.reduce((sum, c) => sum + c.amount, 0);
    const lines = items.map((c) =>
      `${c.clientName} — ${c.invoiceNumber} — základ ${formatCurrency(c.baseAmount)}, provize ${formatCurrency(c.amount)}`
    );
    const text = `Podklad k vyplacení provizí\n\n${lines.join("\n")}\n\nCelkem: ${formatCurrency(total)}`;
    navigator.clipboard.writeText(text);
    toast.success("Podklad zkopírován do schránky");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Provize" />

      {/* Summary cards */}
      {summaryMap.size > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...summaryMap.entries()].map(([uid, s]) => (
            <Card key={uid}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sazba</span>
                    <span>{s.rate !== undefined ? `${Math.round(s.rate * 100)} %` : "default"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">K vyplacení</span>
                    <span className="font-semibold">{formatCurrency(s.pending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vyplaceno letos</span>
                    <span>{formatCurrency(s.paidThisYear)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={salesFilter} onValueChange={(val) => val && setSalesFilter(val)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Obchodník" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni</SelectItem>
            {salesUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="pending">K vyplacení</SelectItem>
            <SelectItem value="paid">Vyplaceno</SelectItem>
            <SelectItem value="reversed">Stornováno</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <>
            <Button size="sm" onClick={() => setPayoutDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Vyplatit ({selected.size})
            </Button>
            <Button variant="outline" size="sm" onClick={copyPodklad}>
              <Copy className="mr-2 h-4 w-4" />
              Kopírovat podklad
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                {pendingForSelection.length > 0 && (
                  <Checkbox
                    checked={selected.size === pendingForSelection.length && pendingForSelection.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                )}
              </TableHead>
              <TableHead>Obchodník</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Faktura</TableHead>
              <TableHead className="text-right">Základ</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Provize</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Zaplaceno dne</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Žádné provize
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className={c.amount < 0 ? "text-red-600 dark:text-red-400" : ""}>
                  <TableCell>
                    {c.status === "pending" && (
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{c.salesName}</TableCell>
                  <TableCell>{c.clientName}</TableCell>
                  <TableCell>{c.invoiceNumber}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.baseAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Math.round(c.rate * 100)} %</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(c.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[c.status] ?? "outline"}>
                      {statusLabels[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(c.earnedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payout dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Označit jako vyplacené</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selected.size} provizí za celkem{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  pendingForSelection
                    .filter((c) => selected.has(c.id))
                    .reduce((sum, c) => sum + c.amount, 0)
                )}
              </span>
            </p>
            <div className="space-y-2">
              <Label>Poznámka (číslo faktury od obchodníka)</Label>
              <Input
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Volitelné..."
              />
            </div>
            <Button onClick={handlePayout} disabled={paying} className="w-full">
              {paying ? "Zpracovávám..." : "Označit vyplacené"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
