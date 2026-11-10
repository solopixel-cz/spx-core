"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Pencil, Plus } from "lucide-react";
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
import { EntityCard, EntityCardEmpty, EntityCardList } from "@/components/entity-card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BILLING_LABELS,
  CATEGORY_LABELS,
  costsInMonth,
  formatOriginal,
  isActiveIn,
  monthLabel,
  planForMonth,
  planMonthlyCzk,
  upcomingDomains,
  upcomingYearly,
  type CostDomain,
  type CostPayment,
  type CostService,
  type EntryStatus,
  type MonthEntry,
  type Rates,
} from "@/lib/costs";
import { CostsChart, type CostsChartRow } from "./costs-chart";

const STATUS: Record<EntryStatus, { label: string; className: string }> = {
  paid: { label: "Zaplaceno", className: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" },
  planned: { label: "Dle plánu", className: "text-muted-foreground" },
  missing: { label: "Nezadáno", className: "border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-400" },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

function EntryAmount({ entry }: { entry: MonthEntry }) {
  if (entry.status === "missing") return <span className="text-muted-foreground">–</span>;
  const original = entry.payment
    ? entry.payment.currency !== "CZK" && formatOriginal(entry.payment.amount, entry.payment.currency)
    : entry.service.currency !== "CZK" && formatOriginal(entry.service.amount, entry.service.currency);
  return (
    <span className="tabular-nums">
      {formatCurrency(entry.czk)}
      {original && <span className="ml-1.5 text-xs text-muted-foreground">{original}</span>}
    </span>
  );
}

function EntryAction({ entry, month }: { entry: MonthEntry; month: string }) {
  return (
    <Button
      variant={entry.status === "missing" ? "default" : "ghost"}
      size="sm"
      nativeButton={false}
      className="relative"
      render={<Link href={`/costs/payments/new?serviceId=${entry.service.id}&month=${month}`} />}
    >
      {entry.payment ? "Upravit" : "Zapsat"}
    </Button>
  );
}

export function CostsPageClient({
  services,
  payments,
  domains,
  domainCount,
  months,
  selectedMonth,
  rates,
  ratesApprox,
  mrr,
}: {
  services: CostService[];
  payments: CostPayment[];
  domains: CostDomain[];
  domainCount: number;
  months: string[];
  selectedMonth: string;
  rates: Rates;
  ratesApprox: boolean;
  mrr: number;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(selectedMonth);
  const currentMonth = months[months.length - 1];

  const [showInactive, setShowInactive] = useState(false);
  const upcoming = upcomingYearly(services);
  const upcomingDomainList = upcomingDomains(domains);

  // Skutečnost po měsících (zapsané platby, jinak plán) pro graf a výběr měsíce.
  const perMonth = useMemo(
    () =>
      months.map((m) => {
        const { entries, dueDomains, domainsCzk, total } = costsInMonth(services, payments, domains, m, rates);
        const row: CostsChartRow = { month: m };
        for (const e of entries) row[e.service.category] = (row[e.service.category] ?? 0) + e.czk;
        // Domény se platí celé v měsíci obnovení.
        if (domainsCzk > 0) row.domains = domainsCzk;
        for (const key of Object.keys(row)) {
          if (key !== "month") row[key as keyof typeof CATEGORY_LABELS] = Math.round(row[key as keyof typeof CATEGORY_LABELS]!);
        }
        return { month: m, entries, dueDomains, total, row };
      }),
    [months, services, payments, rates, domains],
  );
  const chartCategories = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).filter((c) =>
    perMonth.some((p) => (p.row[c] ?? 0) > 0),
  );
  const current = perMonth[perMonth.length - 1];
  const selected = perMonth.find((p) => p.month === month) ?? current;
  const missingCount = selected.entries.filter((e) => e.status === "missing").length;
  const selectedName = monthLabel(selected.month);
  const isCurrent = selected.month === currentMonth;

  // Vše na stránce se řídí vybraným měsícem; plán za rok jen z dnešních cen.
  const planSelected = planForMonth(services, domains, selected.month, rates);
  const planCurrent = planForMonth(services, domains, currentMonth, rates);
  const margin = mrr - selected.total;
  const byCategory = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[])
    .map((category) => ({ category, czk: selected.row[category] ?? 0 }))
    .filter((c) => c.czk > 0)
    .sort((a, b) => b.czk - a.czk);
  const activeServices = services.filter((s) => isActiveIn(s, selected.month));
  const inactiveServices = services.filter((s) => !isActiveIn(s, selected.month));
  const listedServices = showInactive ? [...activeServices, ...inactiveServices] : activeServices;
  const emptyServices =
    services.length === 0 ? "Zatím žádná služba. Přidejte Vercel, Google Cloud, OpenAI…" : "V tomto měsíci žádná aktivní služba";

  function selectMonth(m: string) {
    setMonth(m);
    router.replace(`/costs?month=${m}`, { scroll: false });
  }

  const stats = [
    {
      label: `${selectedName} skutečně`,
      value: formatCurrency(selected.total),
      sub: missingCount > 0 ? "chybí zápis spotřeby" : "zapsané platby a plán",
    },
    { label: `Plán ${selectedName}`, value: formatCurrency(planSelected), sub: "pevné služby, odhady a domény" },
    { label: "Plán za rok", value: formatCurrency(planCurrent * 12), sub: "při dnešních cenách a kurzu" },
    {
      label: "Zbývá z předplatného",
      value: formatCurrency(margin),
      sub: `příjmy ${formatCurrency(mrr)} měsíčně (dnes)`,
      tone: margin < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Náklady</h1>
        <div className="flex items-center gap-2">
          {/* Měsíc řídí přehled, kategorie, platby i služby. */}
          <Select
            items={Object.fromEntries(months.map((m) => [m, monthLabel(m)]))}
            value={selected.month}
            onValueChange={(v) => v && selectMonth(String(v))}
          >
            <SelectTrigger size="sm" className="w-40 first-letter:uppercase" aria-label="Měsíc">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...months].reverse().map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => selectMonth(currentMonth)}>
              Tento měsíc
            </Button>
          )}
          <Button size="sm" nativeButton={false} render={<Link href="/costs/services/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nová služba
          </Button>
        </div>
      </div>

      {ratesApprox && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Kurz ČNB se nepodařilo načíst, plán v cizí měně je orientační.
        </p>
      )}

      {(upcoming.length > 0 || upcomingDomainList.length > 0) && (
        <div className="space-y-1.5 rounded-xl border px-3 py-2.5">
          {upcomingDomainList.map((d) => (
            <Link
              key={d.id}
              href={`/domains/${d.id}/edit`}
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <CalendarClock className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate">
                Obnovení domény {d.name}
                {d.clientName && <span className="text-muted-foreground"> ({d.clientName})</span>}:{" "}
                {formatCurrency(d.price)}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{fmtDate(d.renewalAt!)}</span>
            </Link>
          ))}
          {upcoming.map((s) => (
            <Link
              key={s.id}
              href={`/costs/services/${s.id}/edit`}
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <CalendarClock className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate">
                Roční platba {s.name}: {formatOriginal(s.amount, s.currency)}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{fmtDate(s.nextPaymentAt!)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground first-letter:uppercase sm:text-sm">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-xl font-bold tabular-nums sm:text-2xl", s.tone)}>{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Posledních 12 měsíců</CardTitle>
          </CardHeader>
          <CardContent>
            {chartCategories.length > 0 ? (
              <CostsChart
                data={perMonth.map((p) => p.row)}
                categories={chartCategories}
                selected={selected.month}
                onSelect={selectMonth}
              />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Zatím žádné náklady</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium first-letter:uppercase">Podle kategorie · {selectedName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCategory.length === 0 && <p className="text-sm text-muted-foreground">Za tento měsíc nic</p>}
            {byCategory.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{CATEGORY_LABELS[c.category]}</span>
                  <span className="tabular-nums">{formatCurrency(c.czk)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${selected.total ? Math.max(2, (c.czk / selected.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {domains.length < domainCount && (
              <p className="pt-1 text-xs text-muted-foreground">
                Cenu má {domains.length} z {domainCount} domén.{" "}
                <Link href="/domains" className="underline hover:text-foreground">Doplnit ve správě domén</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Měsíc: skutečné platby, zápis spotřeby */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold first-letter:uppercase">Platby · {selectedName}</h2>
            <p className="text-sm text-muted-foreground">
              Celkem {formatCurrency(selected.total)}
              {missingCount > 0 && ` · ${missingCount} ${missingCount === 1 ? "služba čeká" : "služby čekají"} na zápis`}
            </p>
          </div>
        </div>

        <EntityCardList>
          {selected.entries.length === 0 && selected.dueDomains.length === 0 ? (
            <EntityCardEmpty>Za tento měsíc nic</EntityCardEmpty>
          ) : (
            <>
              {selected.entries.map((e) => (
                <EntityCard
                  key={e.service.id}
                  title={e.service.name}
                  subtitle={CATEGORY_LABELS[e.service.category]}
                  badge={<Badge variant="outline" className={STATUS[e.status].className}>{STATUS[e.status].label}</Badge>}
                >
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <EntryAmount entry={e} />
                    <EntryAction entry={e} month={selected.month} />
                  </div>
                </EntityCard>
              ))}
              {selected.dueDomains.map((d) => (
                <EntityCard
                  key={d.id}
                  href={`/domains/${d.id}/edit`}
                  title={d.name}
                  subtitle={`Doména · ${d.clientName ?? "bez klienta"}`}
                  badge={<Badge variant="outline" className={STATUS.planned.className}>Obnovení</Badge>}
                >
                  <p className="mt-2 text-sm tabular-nums">{formatCurrency(d.price)}</p>
                </EntityCard>
              ))}
            </>
          )}
        </EntityCardList>

        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Služba</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Částka</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.entries.length === 0 && selected.dueDomains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Za tento měsíc nic</TableCell>
                </TableRow>
              )}
              {selected.entries.map((e) => (
                <TableRow key={e.service.id}>
                  <TableCell>
                    <span className="font-medium">{e.service.name}</span>
                    {e.service.vendor && <span className="text-muted-foreground"> · {e.service.vendor}</span>}
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[e.service.category]}</TableCell>
                  <TableCell>
                    <EntryAmount entry={e} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS[e.status].className}>{STATUS[e.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <EntryAction entry={e} month={selected.month} />
                  </TableCell>
                </TableRow>
              ))}
              {selected.dueDomains.map((d) => (
                <TableRow key={d.id} href={`/domains/${d.id}/edit`}>
                  <TableCell>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground"> · {d.clientName ?? "bez klienta"}</span>
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS.domains}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(d.price)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS.planned.className}>Obnovení</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Služby: plán */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Služby</h2>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {selectedName}: {activeServices.length} {activeServices.length === 1 ? "aktivní" : "aktivních"}
            </p>
          </div>
          {inactiveServices.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowInactive((v) => !v)}>
              {showInactive ? "Skrýt ostatní" : `Zobrazit ostatní (${inactiveServices.length})`}
            </Button>
          )}
        </div>

        <EntityCardList>
          {listedServices.length === 0 ? (
            <EntityCardEmpty>{emptyServices}</EntityCardEmpty>
          ) : (
            listedServices.map((s) => (
              <EntityCard
                key={s.id}
                href={`/costs/services/${s.id}/edit`}
                className={!isActiveIn(s, selected.month) ? "opacity-60" : undefined}
                title={s.name}
                subtitle={[CATEGORY_LABELS[s.category], BILLING_LABELS[s.billing]].join(" · ")}
                badge={<span className="text-sm font-semibold tabular-nums">{formatOriginal(s.amount, s.currency)}</span>}
                meta={
                  s.billing === "once"
                    ? `Zaplaceno ${fmtDate(s.startedAt)}`
                    : s.endedAt
                    ? `Zrušeno k ${fmtDate(s.endedAt)}`
                    : `${formatCurrency(planMonthlyCzk(s, rates))} měsíčně${s.nextPaymentAt ? ` · příští platba ${fmtDate(s.nextPaymentAt)}` : ""}`
                }
              />
            ))
          )}
        </EntityCardList>

        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Služba</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Platba</TableHead>
                <TableHead className="text-right">Částka</TableHead>
                <TableHead className="text-right">Měsíčně</TableHead>
                <TableHead>Poznámka</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listedServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {emptyServices}
                  </TableCell>
                </TableRow>
              )}
              {listedServices.map((s) => (
                <TableRow key={s.id} href={`/costs/services/${s.id}/edit`} className={!isActiveIn(s, selected.month) ? "opacity-60" : undefined}>
                  <TableCell>
                    <span className="font-medium">{s.name}</span>
                    {s.vendor && <span className="text-muted-foreground"> · {s.vendor}</span>}
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[s.category]}</TableCell>
                  <TableCell>
                    {BILLING_LABELS[s.billing]}
                    {s.billing === "once" && (
                      <div className="text-xs text-muted-foreground">{fmtDate(s.startedAt)}</div>
                    )}
                    {s.nextPaymentAt && !s.endedAt && (
                      <div className="text-xs text-muted-foreground">příští {fmtDate(s.nextPaymentAt)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatOriginal(s.amount, s.currency)}
                    {s.billing === "usage" && <div className="text-xs text-muted-foreground">odhad</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.billing === "once" ? (
                      <span className="text-xs text-muted-foreground">jednorázově</span>
                    ) : s.endedAt ? (
                      <span className="text-xs text-muted-foreground">zrušeno k {fmtDate(s.endedAt)}</span>
                    ) : (
                      formatCurrency(planMonthlyCzk(s, rates))
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{s.note}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      aria-label="Upravit"
                      render={<Link href={`/costs/services/${s.id}/edit`} />}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
