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
  History,
  Plus,
  UserPlus,
  Phone,
  CalendarClock,
  ListChecks,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardChart, type ChartSeries } from "./dashboard-chart";

// Deterministic color from uid for avatar
const avatarColors = [
  "bg-teal-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-emerald-600", "bg-indigo-600", "bg-orange-600",
];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "teď";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "včera";
  return `${days} d`;
}

interface ActivityItem {
  id: string;
  actorUid: string;
  actor: string;
  text: string;
  href: string;
  createdAt: string | null;
}

interface FollowUp {
  id: string;
  name: string;
  company: string | null;
  nextFollowUpAt: string;
  overdue: boolean;
}

interface UpcomingBill {
  id: string;
  clientId: string;
  clientName: string;
  nextInvoiceAt: string;
  amount: number;
  overdue: boolean;
}

/** Malé statistické okénko (KPI). */
function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <Card className={href ? "h-full transition-colors hover:bg-muted/50" : "h-full"}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-heading text-xl font-bold tabular-nums", accent)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function DashboardClient({
  pipelineValue,
  mrr,
  paidThisMonth,
  invoicedThisMonth,
  chartSeries = [],
  recentActivity,
  myOpenTasks,
  myTasksOverdue = 0,
  myTasksDueToday = 0,
  overdueInvoices,
  followUps,
  upcomingBilling = [],
  activeClients = 0,
  onboardingCount = 0,
  unpaidInvoices = 0,
  userRole = "member",
}: {
  pipelineValue: number;
  mrr: number;
  paidThisMonth: number;
  invoicedThisMonth: number;
  chartSeries?: ChartSeries[];
  recentActivity: ActivityItem[];
  myOpenTasks: number;
  myTasksOverdue?: number;
  myTasksDueToday?: number;
  overdueInvoices: { count: number; sum: number };
  followUps: FollowUp[];
  upcomingBilling?: UpcomingBill[];
  activeClients?: number;
  onboardingCount?: number;
  unpaidInvoices?: number;
  userRole?: string;
}) {
  const isSales = userRole === "sales";

  const quickActions = [
    { label: "Lead", href: "/leady", icon: Briefcase },
    { label: "Klient", href: "/klienti", icon: UserPlus },
    ...(!isSales ? [{ label: "Faktura", href: "/fakturace/nova", icon: Receipt }] : []),
    { label: "Ticket", href: "/tickety", icon: TicketCheck },
    { label: "Úkol", href: "/ukoly", icon: CheckSquare },
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

      {/* 1. Moje úkoly — hlavní widget, první na co se dívám */}
      <Link href="/ukoly" className="block">
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent transition-colors hover:border-primary/50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Moje úkoly</p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-heading text-4xl font-bold leading-none tabular-nums">
                  {myOpenTasks}
                </span>
                <span className="text-sm text-muted-foreground">
                  {myOpenTasks === 1 ? "otevřený" : "otevřených"}
                </span>
                {myTasksOverdue > 0 && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {myTasksOverdue} po termínu
                  </span>
                )}
                {myTasksDueToday > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {myTasksDueToday} dnes
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* 2. Akční upozornění: faktury po splatnosti + blížící se fakturace + follow-upy */}
      {(!isSales && (overdueInvoices.count > 0 || upcomingBilling.length > 0)) ||
      followUps.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          {!isSales && upcomingBilling.length > 0 && (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Blížící se fakturace
                  </CardTitle>
                  <Link
                    href="/fakturace"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Vše <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {upcomingBilling.slice(0, 5).map((b) => (
                    <Link key={b.id} href={`/fakturace/nova?clientId=${b.clientId}&sub=1`}>
                      <div className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
                        <span className="min-w-0 flex-1 truncate text-sm">{b.clientName}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(b.amount)}
                        </span>
                        <span
                          className={cn(
                            "w-16 shrink-0 text-right text-xs tabular-nums",
                            b.overdue
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          )}
                          suppressHydrationWarning
                        >
                          {b.overdue
                            ? "po termínu"
                            : new Date(b.nextInvoiceAt).toLocaleDateString("cs-CZ", {
                                day: "numeric",
                                month: "numeric",
                              })}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {upcomingBilling.length > 5 && (
                    <p className="px-1 pt-0.5 text-xs text-muted-foreground">
                      … a dalších {upcomingBilling.length - 5}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {!isSales && overdueInvoices.count > 0 && (
            <Link href="/fakturace">
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
          {followUps.length > 0 && (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4 text-primary" />
                    Dnešní follow-upy
                  </CardTitle>
                  <Link
                    href="/prospekti"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Vše <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {followUps.slice(0, 5).map((f) => (
                    <Link key={f.id} href="/prospekti">
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

      {/* 3. Přehled + finanční KPI — admin/member */}
      {!isSales && (
        <div className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard label="Aktivní klienti" value={activeClients} href="/klienti" />
            <StatCard label="Onboarding" value={onboardingCount} href="/klienti" />
            <StatCard label="MRR" value={formatCurrency(mrr)} />
            <StatCard
              label="Nezaplacené faktury"
              value={unpaidInvoices}
              accent={unpaidInvoices > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
              href="/fakturace"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              label="Zaplaceno tento měsíc"
              value={formatCurrency(paidThisMonth)}
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard label="Vyfakturováno tento měsíc" value={formatCurrency(invoicedThisMonth)} />
            <StatCard label="Pipeline hodnota" value={formatCurrency(pipelineValue)} href="/leady" />
            <Card className="col-span-2 min-w-0 md:col-span-4">
              <CardContent className="min-w-0 pt-4">
                <DashboardChart series={chartSeries} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 4. Poslední aktivita */}
      <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Aktivita
                </CardTitle>
                <Link
                  href="/aktivita"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Vše <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>Žádná aktivita</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((a) => (
                    <Link key={a.id} href={a.href}>
                      <div className="flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted/50">
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium text-white",
                            getAvatarColor(a.actorUid)
                          )}
                        >
                          {getInitials(a.actor)}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs">
                          <span className="font-medium">{a.actor}</span>{" "}
                          <span className="text-muted-foreground">{a.text}</span>
                        </p>
                        <span
                          className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
