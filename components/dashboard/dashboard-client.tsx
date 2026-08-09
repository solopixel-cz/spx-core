"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Receipt,
  TicketCheck,
  Briefcase,
  ClipboardList,
  CheckSquare,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  BookUser,
  ArrowRight,
  History,
  Plus,
  UserPlus,
  Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/lib/attention";
import { MiniBarChart } from "./mini-bar-chart";
import { EngagementCard, type EngagementDay } from "./engagement-card";

const stageLabels: Record<string, string> = {
  new: "Nový", contacted: "Osloven", demo: "Demo",
  offer: "Nabídka", contract: "Smlouva", onboarding: "Onboarding",
};
const PIPELINE_STAGES = ["new", "contacted", "demo", "offer", "contract", "onboarding"];

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <Receipt className="h-4 w-4" />,
  ticket: <TicketCheck className="h-4 w-4" />,
  lead: <Briefcase className="h-4 w-4" />,
  submission: <ClipboardList className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  prospect: <BookUser className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-sky-600 dark:text-sky-400",
};

const severityIcons: Record<string, React.ReactNode> = {
  high: <AlertCircle className="h-4 w-4" />,
  medium: <AlertTriangle className="h-4 w-4" />,
  low: <Info className="h-4 w-4" />,
};

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

interface OnboardingClient {
  id: string;
  name: string;
  daysIn: number;
  done: number;
  total: number;
  stale: boolean;
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
  attentionItems,
  leadsByStage,
  pipelineValue,
  mrr,
  paidThisMonth,
  invoicedThisMonth,
  monthlyPaidData,
  onboardingClients,
  recentActivity,
  myOpenTasks,
  overdueInvoices,
  followUps,
  engagementDaily,
  engagementToday,
  userRole = "member",
}: {
  attentionItems: AttentionItem[];
  leadsByStage: Record<string, number>;
  pipelineValue: number;
  mrr: number;
  paidThisMonth: number;
  invoicedThisMonth: number;
  monthlyPaidData: { month: string; amount: number }[];
  onboardingClients: OnboardingClient[];
  recentActivity: ActivityItem[];
  myOpenTasks: number;
  overdueInvoices: { count: number; sum: number };
  followUps: FollowUp[];
  engagementDaily: EngagementDay[];
  engagementToday: { opened: number; clicked: number };
  userRole?: string;
}) {
  const isSales = userRole === "sales";
  const MAX_FEED = 8;
  const visibleFeed = attentionItems.slice(0, MAX_FEED);
  const hiddenCount = attentionItems.length - MAX_FEED;
  const maxStage = Math.max(1, ...PIPELINE_STAGES.map((s) => leadsByStage[s] || 0));

  const quickActions = [
    { label: "Lead", href: "/leady", icon: Briefcase },
    { label: "Klient", href: "/klienti", icon: UserPlus },
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

      {/* 1. Vyžaduje akci — priorita na mobilu */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Vyžaduje akci</h2>
        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed p-6 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Vše vyřízeno</span>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleFeed.map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs transition-all hover:bg-muted/50 active:scale-[0.99]">
                  <div className={severityColors[item.severity]}>
                    {severityIcons[item.severity]}
                  </div>
                  <div className="text-muted-foreground">{typeIcons[item.type]}</div>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {hiddenCount > 0 && (
              <p className="px-1 pt-1 text-xs text-muted-foreground">
                … a dalších {hiddenCount} položek
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Akční upozornění: faktury po splatnosti + dnešní follow-upy */}
      {(!isSales && overdueInvoices.count > 0) || followUps.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
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

      {/* 3. Finanční KPI — admin/member */}
      {!isSales && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard label="MRR" value={formatCurrency(mrr)} />
          <StatCard
            label="Zaplaceno tento měsíc"
            value={formatCurrency(paidThisMonth)}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="Vyfakturováno tento měsíc" value={formatCurrency(invoicedThisMonth)} />
          <StatCard label="Pipeline hodnota" value={formatCurrency(pipelineValue)} href="/leady" />
          <Card className="col-span-2 md:col-span-4">
            <CardContent className="pt-4">
              <p className="mb-2 text-xs text-muted-foreground">Zaplaceno (12 měsíců)</p>
              <MiniBarChart data={monthlyPaidData} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Detail: vlevo pipeline + onboarding, vpravo aktivita + engagement */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Pipeline funnel + moje úkoly */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/ukoly" className="sm:col-span-1">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Moje úkoly</p>
                  <p className="mt-1 font-heading text-3xl font-bold tabular-nums">
                    {myOpenTasks}
                  </p>
                  <p className="text-xs text-muted-foreground">otevřené</p>
                </CardContent>
              </Card>
            </Link>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
                  <Link
                    href="/leady"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Leady <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {PIPELINE_STAGES.map((s) => {
                    const count = leadsByStage[s] || 0;
                    return (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">
                          {stageLabels[s]}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(count / maxStage) * 100}%` }}
                          />
                        </div>
                        <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Onboarding */}
          {onboardingClients.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Onboarding</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {onboardingClients.map((c) => (
                  <Link key={c.id} href={`/klienti/${c.id}`}>
                    <Card
                      className={cn(
                        "h-full transition-colors hover:bg-muted/50",
                        c.stale && "border-amber-300 dark:border-amber-700"
                      )}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{c.daysIn} dní</span>
                          <span
                            className={cn(
                              "font-medium",
                              c.stale && "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {c.done}/{c.total} úkolů
                          </span>
                        </div>
                        {c.total > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(c.done / c.total) * 100}%` }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pravý sloupec: aktivita + engagement */}
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

          {/* Engagement — otevření + kliknutí na demo */}
          <EngagementCard today={engagementToday} daily={engagementDaily} />
        </div>
      </div>
    </div>
  );
}
