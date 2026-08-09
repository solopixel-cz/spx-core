"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Check, X, Loader2 } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { invoiceFormSchema, type InvoiceFormData } from "@/lib/schemas/invoice";

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
}

interface ClientOption {
  id: string;
  name: string;
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
  clients,
  stats,
}: {
  invoices: InvoiceRow[];
  clients: ClientOption[];
  stats: {
    overdueCount: number;
    overdueSum: number;
    issuedThisMonthSum: number;
    paidThisMonthSum: number;
  };
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const [defaultDue] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      dueAt: defaultDue,
    },
  });

  async function onSubmit(data: InvoiceFormData) {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      toast.success(`Faktura ${result.number} vystavena`);
      setDialogOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chyba při vytváření faktury");
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="mr-2 h-4 w-4" />Nová faktura</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nová faktura</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Klient *</Label>
                <Select onValueChange={(val) => { if (val) setValue("clientId", String(val)); }}>
                  <SelectTrigger><SelectValue placeholder="Vyberte klienta" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Částka (Kč) *</Label>
                  <Input id="amount" type="number" {...register("amount")} />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueAt">Splatnost *</Label>
                  <Input id="dueAt" type="date" {...register("dueAt")} />
                  {errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt.message}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Vytvářím..." : "Vystavit fakturu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                <span className="font-mono text-sm font-medium">{inv.number}</span>
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
              {(inv.status === "sent" || inv.status === "overdue") && (
                <div className="mt-2 flex gap-2">
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
                </div>
              )}
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
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Žádné faktury</TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">{inv.number}</TableCell>
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
                    <div className="flex gap-1">
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
