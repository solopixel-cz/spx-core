"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityCard, EntityCardEmpty, EntityCardList } from "@/components/entity-card";
import { SortableHead } from "@/components/sortable-head";
import { useTableSort } from "@/lib/use-table-sort";
import { domainHref, renewalLabel, renewalStatus, type RenewalStatus } from "@/lib/domain-renewal";
import { cn } from "@/lib/utils";
import type { DomainData } from "@/components/clients/domains-tab";
import type { ClientOption } from "@/lib/domains";

interface DomainRow extends DomainData {
  clientName: string | null;
}

type Row = DomainRow & { status: RenewalStatus };

// Po expiraci a „do 30 dnů" hlídají jen domény bez automatického obnovení
// (stejně jako připomínky v cronu a na detailu klienta).
const needsRenewal = (r: Row) => !r.autoRenew && r.status.days !== null;
const FILTERS = [
  { key: "all", label: "Vše", match: () => true },
  { key: "overdue", label: "Po expiraci", match: (r: Row) => needsRenewal(r) && r.status.days! < 0 },
  {
    key: "soon",
    label: "Do 30 dnů",
    match: (r: Row) => needsRenewal(r) && r.status.days! >= 0 && r.status.days! <= 30,
  },
  { key: "unassigned", label: "Bez klienta", match: (r: Row) => !r.clientId },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("cs-CZ");
}

/** Barva počtu dní podle naléhavosti; s automatickým obnovením vždy klidná. */
function expiryTone(r: Row): string {
  if (r.autoRenew) return "text-muted-foreground";
  switch (r.status.level) {
    case "overdue":
    case "urgent":
      return "font-medium text-red-600 dark:text-red-400";
    case "soon":
      return "font-medium text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function Expiry({ row }: { row: Row }) {
  if (!row.renewalAt) return <div className="text-muted-foreground">Expirace nevyplněna</div>;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="tabular-nums">{fmtDate(row.renewalAt)}</span>
      <span className={cn("text-xs", expiryTone(row))} suppressHydrationWarning>
        {renewalLabel(row.status)}
      </span>
      {row.autoRenew && <Badge variant="secondary">auto</Badge>}
    </div>
  );
}

const NO_CLIENT = "__none__";

/** Klient domény: odkaz na detail, u nepřiřazené rovnou výběr klienta. */
function ClientCell({ row, clients }: { row: Row; clients: ClientOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (row.clientId) {
    return (
      <Link href={`/clients/${row.clientId}?tab=domeny`} className="relative hover:text-primary hover:underline">
        {row.clientName}
      </Link>
    );
  }

  async function assign(clientId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/domains/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Doména ${row.name} přiřazena`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Nepodařilo se přiřadit klienta");
      setSaving(false);
    }
  }

  return (
    <Select
      items={{ [NO_CLIENT]: "Přiřadit klienta", ...Object.fromEntries(clients.map((c) => [c.id, c.name])) }}
      value={NO_CLIENT}
      disabled={saving}
      onValueChange={(val) => {
        if (val && val !== NO_CLIENT) assign(String(val));
      }}
    >
      <SelectTrigger size="sm" className="relative w-full max-w-56 text-muted-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DomainsPageClient({
  domains,
  clients,
}: {
  domains: DomainRow[];
  clients: ClientOption[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo<Row[]>(
    () => domains.map((d) => ({ ...d, status: renewalStatus(d.renewalAt) })),
    [domains],
  );
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, rows.filter((r) => f.match(r)).length]),
  ) as Record<FilterKey, number>;

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        active.match(r) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.clientName ?? "").toLowerCase().includes(q) ||
          (r.registrar ?? "").toLowerCase().includes(q)),
    );
  }, [rows, filter, query]);

  // Výchozí řazení: nejdřív to, co expiruje nejdřív; bez data na konci.
  const { sorted, sort, toggle } = useTableSort(
    filtered,
    {
      name: (r) => r.name,
      client: (r) => r.clientName,
      registrar: (r) => r.registrar,
      renewalAt: (r) => (r.renewalAt ? new Date(r.renewalAt) : null),
    },
    { key: "renewalAt", dir: "asc" },
  );

  const stats = [
    { key: "overdue" as const, label: "Po expiraci", tone: "text-destructive" },
    { key: "soon" as const, label: "Expiruje do 30 dnů", tone: "text-amber-600 dark:text-amber-400" },
    { key: "unassigned" as const, label: "Bez klienta", tone: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Domény</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/domains/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nová doména
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((s) => (
          <button key={s.key} type="button" onClick={() => setFilter(s.key)} className="text-left">
            <Card className={cn("h-full transition-colors hover:border-primary/40", filter === s.key && "border-primary/60")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-bold tabular-nums", counts[s.key] > 0 && s.tone)}>{counts[s.key]}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)} className="max-w-full overflow-x-auto">
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key}>
                {f.label} <span className="ml-1 tabular-nums opacity-60">{counts[f.key]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Hledat doménu, klienta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-40 flex-1 sm:max-w-xs"
        />
      </div>

      {/* Mobil: karty */}
      <EntityCardList>
        {sorted.length === 0 ? (
          <EntityCardEmpty>Žádné domény</EntityCardEmpty>
        ) : (
          sorted.map((r) => (
            <EntityCard
              key={r.id}
              href={`/domains/${r.id}/edit`}
              className={
                !r.autoRenew && (r.status.level === "overdue" || r.status.level === "urgent")
                  ? "border-l-4 border-l-destructive"
                  : undefined
              }
              title={r.name}
              subtitle={r.registrar ?? undefined}
            >
              <div className="mt-3 space-y-2 text-sm">
                <Expiry row={r} />
                <ClientCell row={r} clients={clients} />
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
              <SortableHead sortKey="name" sort={sort} onSort={toggle}>Doména</SortableHead>
              <SortableHead sortKey="client" sort={sort} onSort={toggle}>Klient</SortableHead>
              <SortableHead sortKey="registrar" sort={sort} onSort={toggle}>Registrátor</SortableHead>
              <SortableHead sortKey="renewalAt" sort={sort} onSort={toggle}>Expirace</SortableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Žádné domény</TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <a
                      href={domainHref(r.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium hover:text-primary hover:underline"
                    >
                      {r.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <ClientCell row={r} clients={clients} />
                  </TableCell>
                  <TableCell>{r.registrar || "–"}</TableCell>
                  <TableCell>
                    <Expiry row={r} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      aria-label="Upravit"
                      render={<Link href={`/domains/${r.id}/edit`} />}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
