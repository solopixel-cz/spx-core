"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { AttentionItem } from "@/lib/attention";
import { MiniBarChart } from "./mini-bar-chart";

const stageLabels: Record<string, string> = {
  new: "Nový", contacted: "Osloven", demo: "Demo",
  offer: "Nabídka", contract: "Smlouva", onboarding: "Onboarding",
};

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <Receipt className="h-4 w-4" />,
  ticket: <TicketCheck className="h-4 w-4" />,
  lead: <Briefcase className="h-4 w-4" />,
  submission: <ClipboardList className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
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

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `před ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  return `před ${days} d`;
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
  actor: string;
  text: string;
  href: string;
  createdAt: string | null;
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
  userRole?: string;
}) {
  const isSales = userRole === "sales";

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Financial row — admin/member only */}
      {!isSales && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(mrr)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Zaplaceno tento měsíc</p>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(paidThisMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Vyfakturováno tento měsíc</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(invoicedThisMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Pipeline hodnota</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(pipelineValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Zaplaceno (12 měs.)</p>
              <MiniBarChart data={monthlyPaidData} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main grid: Feed + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Feed "Vyžaduje akci" */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Vyžaduje akci</h2>
          {attentionItems.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Vše vyřízeno</span>
            </div>
          ) : (
            <div className="space-y-2">
              {attentionItems.map((item, i) => (
                <Link key={i} href={item.href}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div className={severityColors[item.severity]}>
                      {severityIcons[item.severity]}
                    </div>
                    <div className="text-muted-foreground">
                      {typeIcons[item.type]}
                    </div>
                    <span className="flex-1 text-sm">{item.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Quick stats row */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Link href="/leady">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Pipeline</p>
                  <div className="flex gap-2 mt-1">
                    {["new", "contacted", "demo", "offer", "contract", "onboarding"].map((s) => (
                      <span key={s} className="text-xs" title={stageLabels[s]}>
                        {leadsByStage[s] || 0}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/ukoly">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Moje úkoly</p>
                  <p className="text-xl font-bold">{myOpenTasks}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Team activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Aktivita týmu</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádná aktivita</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <Link key={a.id} href={a.href}>
                  <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <p className="text-sm">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">{a.text}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding overview */}
      {onboardingClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Onboarding</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {onboardingClients.map((c) => (
              <Link key={c.id} href={`/klienti/${c.id}`}>
                <Card className={`hover:bg-muted/50 transition-colors ${c.stale ? "border-amber-300 dark:border-amber-700" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{c.daysIn} dní</span>
                      <span className={`font-medium ${c.stale ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        {c.done}/{c.total} úkolů
                      </span>
                    </div>
                    {c.total > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${c.total > 0 ? (c.done / c.total) * 100 : 0}%` }}
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
  );
}
