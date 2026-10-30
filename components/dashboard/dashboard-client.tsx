"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Receipt,
  TicketCheck,
  Briefcase,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  Plus,
  UserPlus,
  Phone,
  Globe,
  Users,
  Rocket,
  Repeat,
  FileWarning,
  Wallet,
  FileText,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardCharts, type ChartSeries } from "./dashboard-chart";

interface FollowUp {
  id: string;
  name: string;
  company: string | null;
  nextFollowUpAt: string;
  overdue: boolean;
}

interface UpcomingDomainRenewal {
  id: string;
  clientId: string;
  clientName: string;
  domainName: string;
  renewalAt: string;
  overdue: boolean;
}

type StatTone = "primary" | "sky" | "violet" | "amber" | "emerald" | "slate";

/** Barevné ladění KPI okénka: podbarvení ikony, jemný přechod a linka nahoře. */
const statTones: Record<StatTone, { icon: string; glow: string; bar: string }> = {
  primary: { icon: "bg-primary/15 text-primary", glow: "from-primary/10", bar: "bg-primary" },
  sky: { icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400", glow: "from-sky-500/10", bar: "bg-sky-500" },
  violet: { icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400", glow: "from-violet-500/10", bar: "bg-violet-500" },
  amber: { icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400", glow: "from-amber-500/10", bar: "bg-amber-500" },
  emerald: { icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", glow: "from-emerald-500/10", bar: "bg-emerald-500" },
  slate: { icon: "bg-muted text-muted-foreground", glow: "from-muted/60", bar: "bg-muted-foreground/40" },
};

/** Statistické okénko (KPI): ikona, hodnota a doplňující řádek. */
function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: React.ReactNode;
  accent?: string;
  href?: string;
}) {
  const t = statTones[tone];
  const inner = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden bg-gradient-to-br via-transparent to-transparent",
        t.glow,
        href && "transition-all hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", t.bar)} />
      <CardContent className="flex h-full flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", t.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-auto space-y-1.5">
          <p className={cn("font-heading text-2xl font-bold leading-none tabular-nums", accent)}>
            {value}
          </p>
          {hint && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hint}
              {href && (
                <ArrowRight className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function DashboardClient({
  openProjectsValue,
  openProjectsCount = 0,
  mrr,
  paidThisMonth,
  invoicedThisMonth,
  chartSeries = [],
  overdueInvoices,
  followUps,
  upcomingDomainRenewals = [],
  activeClients = 0,
  onboardingCount = 0,
  unpaidInvoices = 0,
  userRole = "member",
}: {
  openProjectsValue: number;
  openProjectsCount?: number;
  mrr: number;
  paidThisMonth: number;
  invoicedThisMonth: number;
  chartSeries?: ChartSeries[];
  overdueInvoices: { count: number; sum: number };
  followUps: FollowUp[];
  upcomingDomainRenewals?: UpcomingDomainRenewal[];
  activeClients?: number;
  onboardingCount?: number;
  unpaidInvoices?: number;
  userRole?: string;
}) {
  const isSales = userRole === "sales";
  const alertCount =
    (!isSales && overdueInvoices.count > 0 ? 1 : 0) +
    (upcomingDomainRenewals.length > 0 ? 1 : 0) +
    (followUps.length > 0 ? 1 : 0);

  const quickActions = [
    { label: "Oslovení", href: "/prospects", icon: Briefcase },
    { label: "Klient", href: "/clients", icon: UserPlus },
    ...(!isSales ? [{ label: "Faktura", href: "/invoices/new", icon: Receipt }] : []),
    { label: "Ticket", href: "/tickets", icon: TicketCheck },
    { label: "Úkol", href: "/tasks", icon: CheckSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header + rychlé akce */}
      <PageHeader
        title="Dashboard"
        action={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                <a.icon className="mr-1.5 h-3.5 w-3.5" />
                {a.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* 1. Akční upozornění: faktury po splatnosti, obnovení domén, follow-upy.
          Počet sloupců podle počtu karet, aby vedle nich nezůstávalo prázdné místo. */}
      {alertCount > 0 ? (
        <div
          className={cn(
            "grid gap-3 md:gap-4",
            alertCount === 2 && "sm:grid-cols-2",
            alertCount >= 3 && "sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {!isSales && overdueInvoices.count > 0 && (
            <Link href="/invoices">
              <Card className="h-full border-destructive/40 transition-colors hover:bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Faktury po splatnosti</p>
                  </div>
                  <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-destructive">
                    {formatCurrency(overdueInvoices.sum)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {overdueInvoices.count}{" "}
                    {overdueInvoices.count === 1 ? "faktura" : "faktur"} k řešení
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          {upcomingDomainRenewals.length > 0 && (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-primary" />
                    Blížící se obnovení domén
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {upcomingDomainRenewals.slice(0, 5).map((d) => (
                    <Link key={d.id} href={`/clients/${d.clientId}`}>
                      <div className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {d.domainName}
                          <span className="text-muted-foreground"> · {d.clientName}</span>
                        </span>
                        <span
                          className={cn(
                            "w-16 shrink-0 text-right text-xs tabular-nums",
                            d.overdue
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          )}
                          suppressHydrationWarning
                        >
                          {d.overdue
                            ? "po termínu"
                            : new Date(d.renewalAt).toLocaleDateString("cs-CZ", {
                                day: "numeric",
                                month: "numeric",
                              })}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {upcomingDomainRenewals.length > 5 && (
                    <p className="px-1 pt-0.5 text-xs text-muted-foreground">
                      … a dalších {upcomingDomainRenewals.length - 5}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {followUps.length > 0 && (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4 text-primary" />
                    Dnešní follow-upy
                  </CardTitle>
                  <Link
                    href="/prospects"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Vše <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {followUps.slice(0, 5).map((f) => (
                    <Link key={f.id} href="/prospects">
                      <div className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {f.name}
                          {f.company && (
                            <span className="text-muted-foreground"> · {f.company}</span>
                          )}
                        </span>
                        {f.overdue && (
                          <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">
                            po termínu
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {followUps.length > 5 && (
                    <p className="px-1 pt-0.5 text-xs text-muted-foreground">
                      … a dalších {followUps.length - 5}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* 2. Přehled + finanční KPI — admin/member */}
      {!isSales && (
        <div className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              label="Aktivní klienti"
              value={activeClients}
              icon={Users}
              tone="primary"
              hint="Ve stavu Aktivní"
              href="/clients"
            />
            <StatCard
              label="Onboarding"
              value={onboardingCount}
              icon={Rocket}
              tone="sky"
              hint={onboardingCount === 0 ? "Nikdo se nezakládá" : "Vizitky v přípravě"}
              href="/clients"
            />
            <StatCard
              label="MRR"
              value={formatCurrency(mrr)}
              icon={Repeat}
              tone="violet"
              hint={<>ročně {formatCurrency(mrr * 12)}</>}
            />
            <StatCard
              label="Nezaplacené faktury"
              value={unpaidInvoices}
              icon={FileWarning}
              tone={unpaidInvoices > 0 ? "amber" : "slate"}
              accent={unpaidInvoices > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
              hint={unpaidInvoices > 0 ? "Čeká na úhradu" : "Vše zaplaceno"}
              href="/invoices"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
            <StatCard
              label="Zaplaceno tento měsíc"
              value={formatCurrency(paidThisMonth)}
              icon={Wallet}
              tone="emerald"
              accent="text-emerald-600 dark:text-emerald-400"
              hint="Přijaté platby"
            />
            <StatCard
              label="Vyfakturováno tento měsíc"
              value={formatCurrency(invoicedThisMonth)}
              icon={FileText}
              tone="slate"
              hint="Vystavené faktury"
            />
            <StatCard
              label="Rozpracované zakázky"
              value={formatCurrency(openProjectsValue)}
              icon={Hammer}
              tone="amber"
              hint={<>{openProjectsCount} {openProjectsCount === 1 ? "zakázka" : openProjectsCount >= 2 && openProjectsCount <= 4 ? "zakázky" : "zakázek"} k vyfakturování</>}
              href="/clients"
            />
          </div>
          <DashboardCharts series={chartSeries} />
        </div>
      )}
    </div>
  );
}
