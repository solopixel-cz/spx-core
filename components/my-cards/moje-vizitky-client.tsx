"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { SortableHead } from "@/components/sortable-head";
import { clientStatus, instanceStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import { useTableSort } from "@/lib/use-table-sort";

interface ClientRow {
  id: string;
  name: string;
  status: string;
  instanceStatus: string | null;
  /** Názvy běžících předplatných (subscriptionLabel), čárkou. */
  plan: string | null;
  priceMonthly: number;
}

export function MojeVizitkyClient({ clients }: { clients: ClientRow[] }) {
  // Řazení tabulky (výchozí: abecedně podle jména)
  const clientSort = useTableSort(
    clients,
    {
      name: (c) => c.name,
      status: (c) => clientStatus[c.status]?.label ?? c.status,
      instance: (c) => (c.instanceStatus ? (instanceStatus[c.instanceStatus]?.label ?? c.instanceStatus) : null),
      plan: (c) => c.plan,
      price: (c) => (c.priceMonthly > 0 ? c.priceMonthly : null),
    },
    { key: "name", dir: "asc" },
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Moje vizitky" />

      {/* My clients */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Moji klienti</h2>

        {/* Mobil: karty */}
        <EntityCardList>
          {clients.length === 0 ? (
            <EntityCardEmpty>Zatím žádní klienti</EntityCardEmpty>
          ) : (
            clientSort.sorted.map((c) => (
              <EntityCard
                key={c.id}
                title={c.name}
                badge={<StatusBadge map={clientStatus} value={c.status} />}
                subtitle={c.plan ?? undefined}
                meta={
                  <>
                    {c.instanceStatus && (
                      <StatusBadge
                        map={instanceStatus}
                        value={c.instanceStatus}
                      />
                    )}
                    {c.priceMonthly > 0 && (
                      <span>{formatCurrency(c.priceMonthly)}/měs.</span>
                    )}
                  </>
                }
              />
            ))
          )}
        </EntityCardList>

        {/* Desktop: tabulka */}
        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead sortKey="name" sort={clientSort.sort} onSort={clientSort.toggle}>Jméno</SortableHead>
                <SortableHead sortKey="status" sort={clientSort.sort} onSort={clientSort.toggle}>Stav</SortableHead>
                <SortableHead sortKey="instance" sort={clientSort.sort} onSort={clientSort.toggle}>Vizitka</SortableHead>
                <SortableHead sortKey="plan" sort={clientSort.sort} onSort={clientSort.toggle}>Tarif</SortableHead>
                <SortableHead sortKey="price" sort={clientSort.sort} onSort={clientSort.toggle} className="text-right">Cena/měs.</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Zatím žádní klienti
                  </TableCell>
                </TableRow>
              ) : (
                clientSort.sorted.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <StatusBadge map={clientStatus} value={c.status} />
                    </TableCell>
                    <TableCell>
                      {c.instanceStatus ? (
                        <StatusBadge map={instanceStatus} value={c.instanceStatus} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{c.plan ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.priceMonthly > 0 ? formatCurrency(c.priceMonthly) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
