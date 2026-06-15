"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Mail,
  MousePointerClick,
  Eye,
  History,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { AttentionItem } from "@/lib/attention";
import { MiniBarChart } from "./mini-bar-chart";
import { EngagementCard, type EngagementDay } from "./engagement-card";

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

interface ProspectStats {
  contactedThisWeek: number;
  responding: number;
  converted: number;
}

interface ProspectOwnerStats {
  uid: string;
  name: string;
  claimed: number;
  contacted: number;
  responding: number;
  converted: number;
}

interface OutreachWeekStats {
  sent: number;
  opened: number;
  clicked: number;
}

interface ActivityItem {
  id: string;
  actorUid: string;
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
  prospectStats,
  prospectOwnerStats,
  outreachWeekStats,
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
  prospectStats: ProspectStats;
  prospectOwnerStats: ProspectOwnerStats[];
  outreachWeekStats: OutreachWeekStats;
  engagementDaily: EngagementDay[];
  engagementToday: { opened: number; clicked: number };
  userRole?: string;
}) {
  const isSales = userRole === "sales";
  const MAX_FEED = 8;
  const visibleFeed = attentionItems.slice(0, MAX_FEED);
  const hiddenCount = attentionItems.length - MAX_FEED;

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

      {/* Main grid: Left (feed + onboarding) | Right (activity + outreach) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feed "Vyžaduje akci" */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Vyžaduje akci</h2>
            {attentionItems.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Vše vyřízeno</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {visibleFeed.map((item, i) => (
                  <Link key={i} href={item.href}>
                    <div className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                      <div className={severityColors[item.severity]}>
                        {severityIcons[item.severity]}
                      </div>
                      <div className="text-muted-foreground">
                        {typeIcons[item.type]}
                      </div>
                      <span className="flex-1 text-sm truncate">{item.title}</span>
                    </div>
                  </Link>
                ))}
                {hiddenCount > 0 && (
                  <p className="text-xs text-muted-foreground px-3 pt-1">
                    … a dalších {hiddenCount} položek
                  </p>
                )}
              </div>
            )}
          </div>

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

          {/* Onboarding overview — moved here from bottom */}
          {onboardingClients.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Onboarding</h2>
              <div className="grid gap-3 md:grid-cols-2">
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Compact activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aktivita</CardTitle>
                <Link href="/aktivita" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Vše <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <History className="h-4 w-4" />
                  <span>Žádná aktivita</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((a) => (
                    <Link key={a.id} href={a.href}>
                      <div className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50 transition-colors">
                        <div
                          className={`flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-medium text-white ${getAvatarColor(a.actorUid)}`}
                        >
                          {getInitials(a.actor)}
                        </div>
                        <p className="flex-1 text-xs truncate min-w-0">
                          <span className="font-medium">{a.actor}</span>{" "}
                          <span className="text-muted-foreground">{a.text}</span>
                        </p>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement — dnes + 7denní rozpad otevření a kliknutí */}
          <EngagementCard today={engagementToday} daily={engagementDaily} />

          {/* Outreach this week */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Oslovení tento týden</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Odesláno</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{outreachWeekStats.sent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Otevřelo</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{outreachWeekStats.opened}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    <span className="font-medium">Kliklo na demo</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{outreachWeekStats.clicked}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prospect summary card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Oslovování celkem</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{prospectStats.contactedThisWeek}</p>
                  <p className="text-[10px] text-muted-foreground">Osloveno</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{prospectStats.responding}</p>
                  <p className="text-[10px] text-muted-foreground">Reaguje</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{prospectStats.converted}</p>
                  <p className="text-[10px] text-muted-foreground">Konverze</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: Owner breakdown for admins */}
      {!isSales && prospectOwnerStats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Oslovování po obchodnících</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obchodník</TableHead>
                  <TableHead className="text-right">Zabráno</TableHead>
                  <TableHead className="text-right">Osloveno</TableHead>
                  <TableHead className="text-right">Reaguje</TableHead>
                  <TableHead className="text-right">Konverze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospectOwnerStats.map((s) => (
                  <TableRow key={s.uid}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.claimed}</TableCell>
                    <TableCell className="text-right">{s.contacted}</TableCell>
                    <TableCell className="text-right">{s.responding}</TableCell>
                    <TableCell className="text-right">{s.converted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
