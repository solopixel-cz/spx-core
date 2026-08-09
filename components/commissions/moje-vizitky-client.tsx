"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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
import { clientStatus, instanceStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";

interface ClientRow {
  id: string;
  name: string;
  status: string;
  instanceStatus: string | null;
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

const planLabels: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

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
            clients.map((c) => (
              <EntityCard
                key={c.id}
                title={c.name}
                badge={<StatusBadge map={clientStatus} value={c.status} />}
                subtitle={c.plan ? planLabels[c.plan] ?? c.plan : undefined}
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
                <TableHead>Jméno</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Vizitka</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead className="text-right">Cena/měs.</TableHead>
                <TableHead className="text-right">Provize/měs.</TableHead>
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
                clients.map((c) => (
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
                    <TableCell>{c.plan ? planLabels[c.plan] ?? c.plan : "—"}</TableCell>
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
            commissions.map((c) => (
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
                <TableHead>Klient</TableHead>
                <TableHead className="text-right">Částka</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Datum</TableHead>
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
                commissions.map((c) => (
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
