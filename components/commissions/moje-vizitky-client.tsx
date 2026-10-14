"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { useTableSort } from "@/lib/use-table-sort";

interface ClientRow {
  id: string;
  name: string;
  status: string;
  instanceStatus: string | null;
  /** Názvy běžících předplatných (subscriptionLabel), čárkou. */
  plan: string | null;
  priceMonthly: number;
  myCommission: number;
}

interface CommissionRow {
  id: string;
  clientName: string;
  amount: number;
  status: string;
  earnedAt: string | null;
  paidAt: string | null;
}

const commissionStatusLabels: Record<string, string> = {
  pending: "Čeká",
  paid: "Vyplaceno",
  reversed: "Stornováno",
};

export function MojeVizitkyClient({
  clients,
  commissions,
  pendingTotal,
  paidThisYear,
  monthlyCommission,
  rate,
}: {
  clients: ClientRow[];
  commissions: CommissionRow[];
  pendingTotal: number;
  paidThisYear: number;
  monthlyCommission: number;
  rate: number;
}) {
  // Řazení tabulek (výchozí: abecedně podle jména / klienta)
  const clientSort = useTableSort(
    clients,
    {
      name: (c) => c.name,
      status: (c) => clientStatus[c.status]?.label ?? c.status,
      instance: (c) => (c.instanceStatus ? (instanceStatus[c.instanceStatus]?.label ?? c.instanceStatus) : null),
      plan: (c) => c.plan,
      price: (c) => (c.priceMonthly > 0 ? c.priceMonthly : null),
      commission: (c) => (c.myCommission > 0 ? c.myCommission : null),
    },
    { key: "name", dir: "asc" },
  );
  const commissionSort = useTableSort(
    commissions,
    {
      client: (c) => c.clientName,
      amount: (c) => c.amount,
      status: (c) => commissionStatusLabels[c.status] ?? c.status,
      date: (c) => {
        const d = c.paidAt ?? c.earnedAt;
        return d ? new Date(d) : null;
      },
    },
    { key: "client", dir: "asc" },
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Moje vizitky" />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Čeká na vyplacení</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Vyplaceno letos</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(paidThisYear)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Měsíční provize</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(monthlyCommission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Moje sazba</p>
            <p className="text-xl font-bold">{Math.round(rate * 100)} %</p>
          </CardContent>
        </Card>
      </div>

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
                    {c.myCommission > 0 && (
                      <span className="font-medium text-foreground">
                        Provize {formatCurrency(c.myCommission)}/měs.
                      </span>
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
                <SortableHead sortKey="commission" sort={clientSort.sort} onSort={clientSort.toggle} className="text-right">Provize/měs.</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                    <TableCell className="text-right tabular-nums font-medium">{c.myCommission > 0 ? formatCurrency(c.myCommission) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* My commissions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Provize</h2>

        {/* Mobil: karty */}
        <EntityCardList>
          {commissions.length === 0 ? (
            <EntityCardEmpty>Zatím žádné provize</EntityCardEmpty>
          ) : (
            commissionSort.sorted.map((c) => (
              <EntityCard
                key={c.id}
                className={c.amount < 0 ? "text-red-600 dark:text-red-400" : ""}
                title={c.clientName}
                badge={
                  <Badge
                    variant={
                      c.status === "paid"
                        ? "default"
                        : c.status === "reversed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {commissionStatusLabels[c.status] ?? c.status}
                  </Badge>
                }
                meta={
                  <>
                    <span className="font-medium text-foreground">
                      {formatCurrency(c.amount)}
                    </span>
                    <span>{formatDate(c.paidAt ?? c.earnedAt)}</span>
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
                <SortableHead sortKey="client" sort={commissionSort.sort} onSort={commissionSort.toggle}>Klient</SortableHead>
                <SortableHead sortKey="amount" sort={commissionSort.sort} onSort={commissionSort.toggle} className="text-right">Částka</SortableHead>
                <SortableHead sortKey="status" sort={commissionSort.sort} onSort={commissionSort.toggle}>Stav</SortableHead>
                <SortableHead sortKey="date" sort={commissionSort.sort} onSort={commissionSort.toggle}>Datum</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Zatím žádné provize
                  </TableCell>
                </TableRow>
              ) : (
                commissionSort.sorted.map((c) => (
                  <TableRow key={c.id} className={c.amount < 0 ? "text-red-600 dark:text-red-400" : ""}>
                    <TableCell className="font-medium">{c.clientName}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : c.status === "reversed" ? "destructive" : "outline"}>
                        {commissionStatusLabels[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(c.paidAt ?? c.earnedAt)}</TableCell>
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
