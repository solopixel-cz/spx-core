"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
  type HeaderContext,
  type SortingFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Building2, Check, Contact, Plus, TriangleAlert } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { ArchiveNotice, ArchiveToggle } from "@/components/archive-toggle";
import {
  BulkArchiveBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/bulk-archive-bar";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import { instanceStatusLabels } from "@/lib/schemas/instance";
import { cn } from "@/lib/utils";
import { HUB_FEATURES, type HubFeature } from "@/lib/hub-features";
import { SortButton } from "@/components/sortable-head";
import { PageHeader } from "@/components/page-header";
import { compareSortValues, type SortValue } from "@/lib/use-table-sort";

export interface ClientRow {
  id: string;
  name: string;
  kind: "person" | "company";
  contactName?: string;
  company?: string;
  email: string;
  status: string;
  /** Služby klienta (fáze 34B): vizitky, weby, zakázky (bez zrušených). */
  services: { cards: number; webs: number; projects: number; openProjects: number };
  /** Vizitka v přehledu: hlavní adresa a stav nasazení (první živá, jinak první). */
  card: { host: string | null; status: string } | null;
  updatedAt: string | null;
  deletedAt: string | null;
  /** paying = nezrušené a ne interní předplatné; internal = interní vizitka; none = bez předplatného */
  billing: "paying" | "internal" | "none";
  planLabel: string | null;
  priceMonthly: number | null;
  /** SoloPixel HUB: dostal pozvánku + zapnuté funkce (`clients.hubFeatures`). */
  hub: { invited: boolean; features: HubFeature[] };
  /** Přehledy: má vizitku (instance nebo předplatné vizitky) / web, zakázku či jiné předplatné. */
  hasCard: boolean;
  hasOther: boolean;
  createdAt: string | null;
  ownerName: string | null;
}

/**
 * Přehledy klientů podle toho, co od nás mají (odvozeno z dat, nic se nevyplňuje):
 * vizitky, weby a zakázky, zájemci bez služby. Klient s obojím je v obou.
 */
type Segment = "cards" | "webs" | "leads" | "all";
const SEGMENTS: Segment[] = ["cards", "webs", "leads", "all"];
const segmentLabels: Record<Segment, string> = {
  cards: "Vizitky",
  webs: "Weby a zakázky",
  leads: "Zájemci",
  all: "Vše",
};
function inSegment(c: ClientRow, segment: Segment): boolean {
  if (segment === "cards") return c.hasCard;
  if (segment === "webs") return c.hasOther;
  if (segment === "leads") return !c.hasCard && !c.hasOther;
  return true;
}

// Sloupce podle přehledu, ať tabulka ukazuje jen to, co k němu patří.
// Stav klienta je u jména (jen výjimky), sloupec „status“ slouží jen filtru.
const HIDDEN_BY_SEGMENT: Record<Segment, string[]> = {
  cards: ["status", "services", "owner", "createdAt", "leadAction"],
  webs: ["status", "card", "hub", "owner", "createdAt", "leadAction"],
  leads: ["status", "card", "billing", "services", "hub"],
  all: ["status", "card", "owner", "createdAt", "leadAction"],
};

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Aktivní",
  paused: "Pozastavený",
  churned: "Odešlý",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  onboarding: "outline",
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

// Řazení sloupce Paušál: platící → interní → bez předplatného; Stav: aktivní první.
const billingRank: Record<ClientRow["billing"], number> = {
  paying: 0,
  internal: 1,
  none: 2,
};
const statusRank: Record<string, number> = {
  active: 0,
  onboarding: 1,
  paused: 2,
  churned: 3,
};

/** Paušál: tarif a pod ním měsíční cena. */
function BillingCell({ client }: { client: ClientRow }) {
  if (client.billing === "internal")
    return <Badge variant="secondary">Interní</Badge>;
  if (client.billing === "none")
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col leading-tight">
      <span>{client.planLabel}</span>
      {client.priceMonthly != null && (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatCurrency(client.priceMonthly)}/měs
        </span>
      )}
    </span>
  );
}

/**
 * HUB stručně: pozvaný „✓ HUB · počet funkcí“ (výčet v nápovědě),
 * se zapnutými funkcemi bez pozvánky upozornění „Nepozván“. Detail je u klienta.
 */
function HubCell({ hub }: { hub: ClientRow["hub"] }) {
  if (!hub.invited && hub.features.length === 0)
    return <span className="text-muted-foreground">—</span>;
  const features = hub.features.map((f) => HUB_FEATURES[f]).join(", ");
  if (!hub.invited)
    return (
      <Badge
        variant="outline"
        title={`Zapnuto bez pozvánky: ${features}`}
        className="gap-1 border-amber-500/40 font-normal text-amber-700 dark:text-amber-300"
      >
        <TriangleAlert className="h-3 w-3" />
        Nepozván
      </Badge>
    );
  return (
    <Badge
      title={features || "Bez zapnutých funkcí"}
      className="gap-1 border-teal-500/30 bg-teal-500/10 text-teal-700 tabular-nums dark:text-teal-300"
    >
      <Check className="h-3 w-3" />
      HUB · {hub.features.length}
    </Badge>
  );
}

/** Stav klienta jen jako výjimka: „Aktivní“ má skoro každý, proto se neukazuje. */
function ClientStatusBadge({ status }: { status: string }) {
  if (status === "active") return null;
  return (
    <Badge variant={statusVariants[status] ?? "secondary"} className="font-normal">
      {statusLabels[status] ?? status}
    </Badge>
  );
}

/** Iniciály klienta (u firmy ikona). */
function ClientAvatar({ client }: { client: ClientRow }) {
  const initials = client.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
    >
      {client.kind === "company" ? <Building2 className="h-4 w-4" /> : initials}
    </span>
  );
}

/** Klient: jméno + stav (výjimky), pod tím značka nebo kontakt a e-mail. */
function ClientCell({ client: c }: { client: ClientRow }) {
  const sub = [
    c.kind === "company" ? c.contactName && `kontakt: ${c.contactName}` : c.company,
    c.email,
  ].filter(Boolean);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <ClientAvatar client={c} />
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
            {c.name}
          </Link>
          <ClientStatusBadge status={c.status} />
        </span>
        {sub.length > 0 && (
          <span className="truncate text-sm text-muted-foreground">{sub.join(" · ")}</span>
        )}
      </span>
    </span>
  );
}

const cardDot: Record<string, string> = {
  live: "bg-emerald-500",
  setup: "border border-amber-500 bg-transparent",
  maintenance: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

/** Vizitka: stav nasazení (tečka) a hlavní adresa jako odkaz. */
function CardCell({ client: c }: { client: ClientRow }) {
  if (!c.card) return <span className="text-muted-foreground">—</span>;
  const { host, status } = c.card;
  const extra = c.services.cards - 1;
  return (
    <span className="flex items-center gap-2" title={instanceStatusLabels[status] ?? status}>
      <span className={cn("size-2 shrink-0 rounded-full", cardDot[status] ?? cardDot.offline)} />
      {host && status === "live" ? (
        <a
          href={`https://${host}`}
          target="_blank"
          rel="noreferrer"
          className="truncate hover:underline"
        >
          {host}
        </a>
      ) : (
        <span className="truncate text-muted-foreground">
          {host ?? instanceStatusLabels[status] ?? status}
        </span>
      )}
      {extra > 0 && <span className="text-sm text-muted-foreground">+{extra}</span>}
    </span>
  );
}

/** 1 zakázka / 2–4 zakázky / 5+ zakázek */
function projectsLabel(n: number) {
  return n === 1 ? "zakázka" : n >= 2 && n <= 4 ? "zakázky" : "zakázek";
}

/** Souhrn služeb: „Vizitka · Web · 2 zakázky (1 rozpracovaná)". */
function ServicesCell({ services: s }: { services: ClientRow["services"] }) {
  const parts = [
    s.cards > 0 && (s.cards > 1 ? `${s.cards} vizitky` : "Vizitka"),
    s.webs > 0 && (s.webs > 1 ? `${s.webs} weby` : "Web"),
    s.projects > 0 && `${s.projects} ${projectsLabel(s.projects)}`,
  ].filter(Boolean);
  if (parts.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      {parts.join(" · ")}
      {s.openProjects > 0 && (
        <span className="text-amber-600 dark:text-amber-400"> ({s.openProjects} rozprac.)</span>
      )}
    </span>
  );
}

const columnHelper = createColumnHelper<ClientRow>();

// Text česky (ch, diakritika); směr aplikuje TanStack sám, proto vždy "asc".
const czSort: SortingFn<ClientRow> = (a, b, id) =>
  compareSortValues(a.getValue<SortValue>(id), b.getValue<SortValue>(id), "asc");
const timeSort: SortingFn<ClientRow> = (a, b, id) =>
  compareSortValues(
    new Date(a.getValue<string>(id)).getTime(),
    new Date(b.getValue<string>(id)).getTime(),
    "asc",
  );

/** Řaditelná hlavička: klik řadí vzestupně, další klik přepne směr. */
function sortHeader(label: string) {
  return function SortHeader({ column }: HeaderContext<ClientRow, unknown>) {
    const dir = column.getIsSorted();
    return (
      <SortButton dir={dir} onClick={() => column.toggleSorting(dir === "asc")}>
        {label}
      </SortButton>
    );
  };
}

const dataColumns = [
  columnHelper.accessor("name", {
    header: sortHeader("Klient"),
    sortingFn: czSort,
    cell: (info) => <ClientCell client={info.row.original} />,
  }),
  // Skrytý sloupec jen pro filtr stavu (stav se ukazuje u jména).
  columnHelper.accessor("status", {
    header: () => null,
    sortingFn: (a, b) =>
      (statusRank[a.original.status] ?? 9) - (statusRank[b.original.status] ?? 9),
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      return row.original.status === filterValue;
    },
  }),
  // Živé první, pak podle adresy.
  columnHelper.accessor((r) => (r.card ? `${r.card.status === "live" ? 0 : 1}${r.card.host ?? ""}` : undefined), {
    id: "card",
    header: sortHeader("Vizitka"),
    sortingFn: czSort,
    sortUndefined: "last",
    enableGlobalFilter: false,
    cell: (info) => <CardCell client={info.row.original} />,
  }),
  columnHelper.accessor("billing", {
    header: sortHeader("Paušál"),
    sortingFn: (a, b) =>
      billingRank[a.original.billing] - billingRank[b.original.billing] ||
      (a.original.priceMonthly ?? 0) - (b.original.priceMonthly ?? 0),
    cell: (info) => <BillingCell client={info.row.original} />,
    enableGlobalFilter: false,
  }),
  // Pozvaní první, pak podle počtu zapnutých funkcí.
  columnHelper.accessor((r) => (r.hub.invited ? 10 : 0) + r.hub.features.length, {
    id: "hub",
    header: sortHeader("HUB"),
    enableGlobalFilter: false,
    cell: (info) => <HubCell hub={info.row.original.hub} />,
  }),
  // Řadí se podle počtu služeb celkem.
  columnHelper.accessor((r) => r.services.cards + r.services.webs + r.services.projects, {
    id: "services",
    header: sortHeader("Služby"),
    enableGlobalFilter: false,
    cell: (info) => <ServicesCell services={info.row.original.services} />,
  }),
  columnHelper.accessor((r) => r.updatedAt ?? undefined, {
    id: "updatedAt",
    header: sortHeader("Aktivita"),
    sortingFn: timeSort,
    sortUndefined: "last",
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {formatRelativeDay(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor((r) => r.ownerName ?? undefined, {
    id: "owner",
    header: sortHeader("Obchodník"),
    sortingFn: czSort,
    sortUndefined: "last",
    enableGlobalFilter: false,
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor((r) => r.createdAt ?? undefined, {
    id: "createdAt",
    header: sortHeader("Založeno"),
    sortingFn: timeSort,
    sortUndefined: "last",
    enableGlobalFilter: false,
    cell: (info) => {
      const val = info.getValue();
      return val ? new Date(val).toLocaleDateString("cs-CZ") : "—";
    },
  }),
  // Zájemce → rovnou založit vizitku (pak sám přejde do přehledu Vizitky).
  columnHelper.display({
    id: "leadAction",
    header: () => null,
    cell: (info) => (
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<Link href={`/clients/${info.row.original.id}/instances/new`} />}
      >
        <Contact className="mr-1.5 h-3.5 w-3.5" />
        Založit vizitku
      </Button>
    ),
  }),
];

const archivedAtColumn = columnHelper.accessor((r) => r.deletedAt ?? undefined, {
  id: "deletedAt",
  header: sortHeader("Archivováno"),
  sortingFn: timeSort,
  sortUndefined: "last",
  cell: (info) => {
    const val = info.getValue();
    return val ? new Date(val).toLocaleDateString("cs-CZ") : "—";
  },
  enableGlobalFilter: false,
});

const FILTER_STORAGE_KEY = "clients:filters";

export function ClientsPageClient({
  clients: initialClients,
  canArchive,
  archived = false,
}: {
  clients: ClientRow[];
  canArchive: boolean;
  /** Tabulka archivovaných klientů (`?archived=1`). */
  archived?: boolean;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [segment, setSegment] = useState<Segment>("cards");
  const [kindFilter, setKindFilter] = useState<"all" | "person" | "company">("all");
  // Výchozí abecedně podle jména; archiv drží pořadí ze serveru (podle data archivace).
  const [sorting, setSorting] = useState<SortingState>(
    archived ? [] : [{ id: "name", desc: false }],
  );
  const [hydrated, setHydrated] = useState(false);

  // Resync ze serveru po router.refresh — úprava stavu během renderu.
  const [prevInitialClients, setPrevInitialClients] = useState(initialClients);
  if (prevInitialClients !== initialClients) {
    setPrevInitialClients(initialClients);
    setClients(initialClients);
  }

  // Obnov filtry z minulé návštěvy (přežije návrat z detailu klienta).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          q?: string;
          status?: string;
          segment?: Segment;
          kind?: "all" | "person" | "company";
        };
        if (saved.q) setGlobalFilter(saved.q);
        if (saved.status && saved.status !== "all") {
          setColumnFilters([{ id: "status", value: saved.status }]);
        }
        // Starší uložené hodnoty (platící / neplatící) ignorovat.
        if (saved.segment && SEGMENTS.includes(saved.segment)) setSegment(saved.segment);
        if (saved.kind) setKindFilter(saved.kind);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Ulož filtry při každé změně (až po prvotním obnovení).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const status =
        (columnFilters.find((f) => f.id === "status")?.value as string) ??
        "all";
      sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ q: globalFilter, status, segment, kind: kindFilter }),
      );
    } catch {
      // ignore
    }
  }, [globalFilter, columnFilters, segment, kindFilter, hydrated]);

  // Typ klienta (osoba / firma) — filtruje ještě před segmenty, ať počty sedí.
  const kindFiltered = useMemo(
    () => (kindFilter === "all" ? clients : clients.filter((c) => c.kind === kindFilter)),
    [clients, kindFilter],
  );

  const segmentCounts = useMemo(
    () =>
      Object.fromEntries(
        SEGMENTS.map((s) => [s, kindFiltered.filter((c) => inSegment(c, s)).length]),
      ) as Record<Segment, number>,
    [kindFiltered],
  );
  const activeSegment: Segment = archived ? "all" : segment;
  const segmentData = useMemo(
    () => kindFiltered.filter((c) => inSegment(c, activeSegment)),
    [kindFiltered, activeSegment],
  );
  const columnVisibility: VisibilityState = Object.fromEntries(
    HIDDEN_BY_SEGMENT[activeSegment].map((id) => [id, false]),
  );

  const baseColumns = archived
    ? [...dataColumns, archivedAtColumn]
    : dataColumns;
  const columns = canArchive
    ? [
        columnHelper.display({
          id: "select",
          header: () => <SelectAllCheckbox selection={selection} />,
          cell: (info) => (
            <RowCheckbox selection={selection} id={info.row.original.id} />
          ),
        }),
        ...baseColumns,
      ]
    : baseColumns;

  const table = useReactTable({
    data: segmentData,
    columns,
    state: { globalFilter, columnFilters, sorting, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    // Hledání i podle kontaktní osoby firmy (není samostatný sloupec).
    globalFilterFn: (row, _columnId, value) => {
      const q = String(value ?? "").toLowerCase().trim();
      if (!q) return true;
      const c = row.original;
      return [c.name, c.company, c.contactName, c.email].some((v) =>
        v?.toLowerCase().includes(q),
      );
    },
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const visibleIds = useMemo(() => rows.map((r) => r.original.id), [rows]);
  const selection = useRowSelection(visibleIds, archived ? "clients:archive" : "clients");

  return (
    <div className="space-y-6">
      <PageHeader
        title={archived ? "Archiv klientů" : "Klienti"}
        action={
          <div className="flex items-center gap-2">
            {canArchive && <ArchiveToggle archived={archived} />}
            {!archived && (
              <Button size="sm" nativeButton={false} render={<Link href="/clients/new" />}>
                <Plus className="mr-2 h-4 w-4" />
                Nový klient
              </Button>
            )}
          </div>
        }
      />

      {archived && <ArchiveNotice count={clients.length} />}

      {!archived && (
        <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
          <TabsList>
            {SEGMENTS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {segmentLabels[s]} ({segmentCounts[s]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <FilterBar>
        <Input
          placeholder="Hledat..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-40 flex-1 sm:max-w-sm"
        />
        <Select
          items={{ all: "Všechny stavy", ...statusLabels }}
          value={
            (columnFilters.find((f) => f.id === "status")?.value as string) ??
            "all"
          }
          onValueChange={(val) =>
            setColumnFilters(
              val === "all" ? [] : [{ id: "status", value: val }],
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="paused">Pozastavený</SelectItem>
            <SelectItem value="churned">Odešlý</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={{ all: "Osoby i firmy", person: "Osoby", company: "Firmy" }}
          value={kindFilter}
          onValueChange={(val) => val && setKindFilter(val as typeof kindFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Osoby i firmy</SelectItem>
            <SelectItem value="person">Osoby</SelectItem>
            <SelectItem value="company">Firmy</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {rows.length === 0 ? (
          <EntityCardEmpty>
            {archived ? "Archiv je prázdný" : "Žádní klienti"}
          </EntityCardEmpty>
        ) : (
          rows.map((row) => {
            const c = row.original;
            return (
              <EntityCard
                key={c.id}
                href={selection.active ? undefined : `/clients/${c.id}`}
                onClick={selection.active ? () => selection.toggle(c.id) : undefined}
                leading={
                  canArchive ? (
                    <RowCheckbox selection={selection} id={c.id} />
                  ) : undefined
                }
                title={
                  c.kind === "company" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Firma" />
                      {c.name}
                    </span>
                  ) : (
                    c.name
                  )
                }
                badge={<ClientStatusBadge status={c.status} />}
                subtitle={[
                  c.kind === "company" ? c.contactName : c.company,
                  c.email,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                meta={
                  <>
                    {c.card ? <CardCell client={c} /> : <ServicesCell services={c.services} />}
                    {c.billing === "paying" && c.planLabel && (
                      <span className="tabular-nums">
                        {c.planLabel}
                        {c.priceMonthly != null && ` · ${formatCurrency(c.priceMonthly)}/měs`}
                      </span>
                    )}
                    {(c.hub.invited || c.hub.features.length > 0) && <HubCell hub={c.hub} />}
                    {c.updatedAt && <span>{formatRelativeDay(c.updatedAt)}</span>}
                  </>
                }
              />
            );
          })
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-xl border bg-card px-2 md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "select" ? "w-12" : undefined}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  Žádní klienti
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  href={`/clients/${row.original.id}`}
                  onRowClick={selection.active ? () => selection.toggle(row.original.id) : undefined}
                  data-state={
                    selection.isSelected(row.original.id)
                      ? "selected"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canArchive && (
        <BulkArchiveBar
          collection="clients"
          selection={selection}
          noun={["klienta", "klienty", "klientů"]}
          mode={archived ? "restore" : "archive"}
          warning="Archivuje i instance, zakázky, otevřené tickety a zruší předplatné."
          restoreNote="Předplatné, instance a zakázky se neobnovují, zkontrolujte je v detailu klienta."
          undoable={false}
          onDone={(ids) =>
            setClients((prev) => prev.filter((c) => !ids.includes(c.id)))
          }
        />
      )}
    </div>
  );
}
