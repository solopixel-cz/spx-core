"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Handshake,
  Receipt,
  TicketCheck,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { isOverdue, type CalendarEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { TrendTiles, type ChartSeries } from "./trend-tiles";
import { TodayCard } from "./today-card";

export interface DashboardData {
  /** Křestní jméno v 5. pádě („Lukáši“), prázdné když ho neznáme. */
  name: string;
  /** Dnešek v Praze, YYYY-MM-DD. */
  today: string;
  isSales: boolean;
  /** Kalendář (admin/member) nebo domény (sales) + follow-upy. */
  agenda: CalendarEvent[];
  /** Čeká na odpověď: zprávy klientů z HUBu, nezpracované podklady. */
  inbox: CalendarEvent[];
  money: {
    mrr: number;
    invoiced: number;
    paid: number;
    costs: number;
    costsPlan: number;
    unpaidCount: number;
    unpaidSum: number;
    overdueCount: number;
    overdueSum: number;
  } | null;
  clients: {
    active: number;
    onboarding: number;
    paused: number;
    newThisMonth: number;
    subscriptions: number | null;
    promoEnding: number | null;
  };
  sales: {
    followUpsDue: number;
    followUpsOverdue: number;
    fresh: number;
    inProgress: number;
    openProjects: number;
    openProjectsValue: number;
  };
  ops: {
    open: number;
    byStatus: { open: number; in_progress: number; code_review: number; waiting_client: number };
    mine: number;
    urgent: number;
    awaitingReply: number;
    submissions: number;
    domainsSoon: number;
    websWithoutTracking: number;
  } | null;
  chartSeries: ChartSeries[];
}

/** 1 věc, 2 věci, 5 věcí. */
function plural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

function dateHeading(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** Nástup prvku se zpožděním (krok 70 ms), viz `animate-rise` v globals.css. */
const rise = (step: number) => ({ className: "animate-rise", style: { "--delay": `${step * 70}ms` } as React.CSSProperties });

type Tone = "default" | "good" | "warn" | "bad";
const TONE_TEXT: Record<Tone, string> = {
  default: "",
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400",
};

/** Řádek přehledu: popis vlevo, hodnota vpravo, volitelně odkaz a doplněk pod popisem. */
function Row({ label, value, hint, tone = "default", href }: { label: string; value: React.ReactNode; hint?: string; tone?: Tone; href?: string }) {
  const inner = (
    <>
      <div className="min-w-0">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        {hint && <p className="truncate text-xs text-muted-foreground/80">{hint}</p>}
      </div>
      <dd className="flex shrink-0 items-center gap-1">
        <span className={cn("text-sm font-semibold tabular-nums", TONE_TEXT[tone])}>{value}</span>
        {href && <ArrowRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover/row:translate-x-0 group-hover/row:opacity-100" />}
      </dd>
    </>
  );
  const cls = "flex items-center justify-between gap-3 py-2";
  return href ? (
    <Link href={href} className={cn(cls, "group/row -mx-2 rounded-md px-2 transition-colors hover:bg-muted/60")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

interface Segment {
  label: string;
  value: number;
  className: string;
}

/** Proužek rozdělený podle stavů s legendou (klienti, oslovení, Backlog). */
function Meter({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className="space-y-2">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {total > 0 &&
          visible.map((s, i) => (
            <span
              key={s.label}
              className={cn("animate-meter h-full first:rounded-l-full last:rounded-r-full", s.className)}
              style={{ width: `${(s.value / total) * 100}%`, "--delay": `${220 + i * 90}ms` } as React.CSSProperties}
            />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", s.className)} />
            {s.label}
            <span className="font-semibold text-foreground tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Podíl (zaplaceno z vyfakturovaného), s popiskem a procenty. */
function Progress({ value, max, label, className }: { value: number; max: number; label: string; className: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground tabular-nums">{max > 0 ? `${pct} %` : "–"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {pct > 0 && <span className={cn("animate-meter block h-full rounded-full", className)} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

const ACCENTS = {
  emerald: { icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", wash: "from-emerald-500/[0.07]" },
  primary: { icon: "bg-primary/15 text-primary", bar: "bg-primary", wash: "from-primary/[0.07]" },
  sky: { icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400", bar: "bg-sky-500", wash: "from-sky-500/[0.07]" },
  violet: { icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400", bar: "bg-violet-500", wash: "from-violet-500/[0.07]" },
};

/** Oblast přehledu: barevná linka, hlavní číslo s popisem, vizuál a řádky. */
function Area({
  title,
  icon: Icon,
  accent,
  href,
  lead,
  leadLabel,
  visual,
  step,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
  href?: string;
  lead: React.ReactNode;
  leadLabel: React.ReactNode;
  visual?: React.ReactNode;
  step: number;
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  const r = rise(step);
  return (
    <Card size="sm" className={cn("relative min-w-0 bg-linear-to-br via-transparent to-transparent", a.wash, r.className)} style={r.style}>
      <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", a.bar)} />
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", a.icon)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            {title}
          </h2>
          {href && (
            <Link href={href} aria-label={`Otevřít ${title}`} className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div>
          <p className="font-heading text-2xl leading-tight font-bold tabular-nums sm:text-[1.65rem]">{lead}</p>
          <p className="text-xs text-muted-foreground">{leadLabel}</p>
        </div>
        {visual}
        <dl className="divide-y border-t">{children}</dl>
      </CardContent>
    </Card>
  );
}

/** Štítek se stavem dne pod pozdravem. */
function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/**
 * Dashboard: pozdrav a souhrn, „Dnes“ (co je potřeba udělat) a přehled pro
 * řízení ve čtyřech oblastech. Na mobilu nahoře pozdrav a Dnes, oblasti pod sebou.
 */
export function DashboardClient({ data }: { data: DashboardData }) {
  const { today, isSales, agenda, inbox, money, clients, sales, ops } = data;

  const overdue = agenda.filter((e) => isOverdue(e, today)).length;
  const todayTodo = agenda.filter((e) => e.day === today && e.state === "todo").length;
  const todo = overdue + todayTodo + inbox.length;

  const summary = [
    todo === 0 ? "Dnes nemáš nic k vyřízení." : `Dnes máš ${todo} ${plural(todo, "věc", "věci", "věcí")} k vyřízení.`,
    money &&
      (money.invoiced > 0
        ? `Tento měsíc přišlo ${formatCurrency(money.paid)} z ${formatCurrency(money.invoiced)} vyfakturovaných.`
        : `Tento měsíc přišlo ${formatCurrency(money.paid)}.`),
  ]
    .filter(Boolean)
    .join(" ");

  const quickActions = [
    { label: "Oslovení", href: "/prospects/new", icon: Briefcase },
    { label: "Klient", href: "/clients/new", icon: UserPlus },
    ...(!isSales ? [{ label: "Faktura", href: "/invoices/new", icon: Receipt }] : []),
    { label: "Úkol", href: "/backlog/new", icon: TicketCheck },
  ];

  const result = money ? money.paid - money.costs : 0;
  const headerRise = rise(0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Úvodní pás: pozdrav, souhrn dne a rychlé akce. Pixelový vzor odkazuje na SoloPixel. */}
      <header className={cn("relative overflow-hidden rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10 sm:px-6 lg:py-4", headerRise.className)} style={headerRise.style}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_62%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(var(--primary)_1.1px,transparent_1.6px)] [background-size:14px_14px] opacity-[0.22] [mask-image:linear-gradient(to_left,black,transparent_85%)] dark:opacity-[0.16]"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">{dateHeading(today)}</p>
            <h1 className="font-heading text-[1.75rem] leading-tight font-bold tracking-tight sm:text-3xl">{data.name ? `Ahoj ${data.name}` : "Ahoj"}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{summary}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {todo === 0 && <Chip className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">Nic nehoří</Chip>}
              {overdue > 0 && <Chip className="bg-rose-500/12 text-rose-700 dark:text-rose-300">{overdue} po termínu</Chip>}
              {todayTodo > 0 && <Chip className="bg-primary/12 text-primary">{todayTodo} na dnešek</Chip>}
              {inbox.length > 0 && <Chip className="bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300">{inbox.length} čeká na tebe</Chip>}
              {money && money.overdueCount > 0 && (
                <Chip className="bg-amber-500/12 text-amber-700 dark:text-amber-300">po splatnosti {formatCurrency(money.overdueSum)}</Chip>
              )}
            </div>
          </div>
          {/* Rychlé akce: na mobilu dlaždice v řadě, jinak tlačítka. */}
          <nav aria-label="Rychlé akce" className={cn("grid gap-2 sm:flex sm:flex-wrap lg:justify-end", quickActions.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-1 rounded-xl bg-background/70 px-2 py-2.5 text-xs font-medium ring-1 ring-foreground/10 backdrop-blur-sm transition-all hover:-translate-y-px hover:ring-primary/40 active:translate-y-0 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:py-1.5 sm:text-sm"
              >
                <a.icon className="h-4 w-4 text-primary sm:h-3.5 sm:w-3.5" />
                <span>
                  <span className="hidden sm:inline">+ </span>
                  {a.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <TodayCard
          agenda={agenda}
          inbox={inbox}
          today={today}
          calendarHref={isSales ? undefined : "/calendar"}
          className={cn("xl:order-2", rise(1).className)}
          style={rise(1).style}
        />

        <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:order-1">
          {data.chartSeries.length > 0 && <TrendTiles series={data.chartSeries} className={cn("sm:col-span-2", rise(2).className)} style={rise(2).style} />}

          {money && (
            <Area
              title="Peníze"
              icon={Wallet}
              accent="emerald"
              href="/invoices"
              step={3}
              lead={formatCurrency(money.mrr)}
              leadLabel={<>pravidelně měsíčně (MRR), ročně {formatCurrency(money.mrr * 12)}</>}
              visual={<Progress value={money.paid} max={money.invoiced} label="Zaplaceno z vyfakturovaného tento měsíc" className="bg-emerald-500" />}
            >
              <Row label="Vyfakturováno tento měsíc" value={formatCurrency(money.invoiced)} href="/invoices" />
              <Row label="Zaplaceno tento měsíc" value={formatCurrency(money.paid)} tone="good" />
              <Row
                label="Náklady tento měsíc"
                value={formatCurrency(money.costs)}
                hint={`plán ${formatCurrency(money.costsPlan)}`}
                tone={money.costs > money.costsPlan ? "warn" : "default"}
                href="/costs"
              />
              <Row label="Zůstává (zaplaceno − náklady)" value={formatCurrency(result)} tone={result >= 0 ? "good" : "bad"} />
              <Row
                label="Nezaplacené faktury"
                value={money.unpaidCount ? formatCurrency(money.unpaidSum) : "0 Kč"}
                hint={
                  money.unpaidCount
                    ? `${money.unpaidCount} ${plural(money.unpaidCount, "faktura", "faktury", "faktur")}${money.overdueCount ? `, ${money.overdueCount} po splatnosti` : ""}`
                    : "vše zaplaceno"
                }
                tone={money.overdueCount ? "bad" : "default"}
                href="/invoices"
              />
            </Area>
          )}

          <Area
            title="Klienti"
            icon={Users}
            accent="primary"
            href="/clients"
            step={4}
            lead={clients.active}
            leadLabel={`${plural(clients.active, "aktivní klient", "aktivní klienti", "aktivních klientů")}${isSales ? " (tvoji)" : ""}`}
            visual={
              <Meter
                segments={[
                  { label: "Aktivní", value: clients.active, className: "bg-primary" },
                  { label: "V přípravě", value: clients.onboarding, className: "bg-sky-400" },
                  { label: "Pozastavení", value: clients.paused, className: "bg-amber-400" },
                ]}
              />
            }
          >
            <Row label="Noví tento měsíc" value={clients.newThisMonth} tone={clients.newThisMonth ? "good" : "default"} href="/clients" />
            {clients.subscriptions !== null && <Row label="Aktivní předplatná" value={clients.subscriptions} />}
            {!!clients.promoEnding && <Row label="Končí akce do 30 dní" value={clients.promoEnding} hint="další faktura v plné ceně" tone="warn" href="/calendar" />}
          </Area>

          <Area
            title="Obchod"
            icon={Handshake}
            accent="sky"
            href="/prospects"
            step={5}
            lead={formatCurrency(sales.openProjectsValue)}
            leadLabel={`${sales.openProjects} ${plural(sales.openProjects, "rozpracovaná zakázka", "rozpracované zakázky", "rozpracovaných zakázek")} k vyfakturování`}
            visual={
              <Meter
                segments={[
                  { label: "K oslovení", value: sales.fresh, className: "bg-slate-300 dark:bg-slate-500" },
                  { label: "V jednání", value: sales.inProgress, className: "bg-sky-500" },
                ]}
              />
            }
          >
            <Row
              label="Follow-upy k vyřízení"
              value={sales.followUpsDue}
              hint={sales.followUpsOverdue ? `${sales.followUpsOverdue} po termínu` : undefined}
              tone={sales.followUpsOverdue ? "bad" : "default"}
              href="/prospects"
            />
          </Area>

          {ops && (
            <Area
              title="Provoz"
              icon={Wrench}
              accent="violet"
              href="/backlog"
              step={6}
              lead={ops.open}
              leadLabel={`${plural(ops.open, "otevřený úkol", "otevřené úkoly", "otevřených úkolů")} v Backlogu`}
              visual={
                <Meter
                  segments={[
                    { label: "K řešení", value: ops.byStatus.open, className: "bg-slate-300 dark:bg-slate-500" },
                    { label: "Rozpracováno", value: ops.byStatus.in_progress, className: "bg-violet-500" },
                    { label: "Review", value: ops.byStatus.code_review, className: "bg-sky-400" },
                    { label: "Čeká na klienta", value: ops.byStatus.waiting_client, className: "bg-amber-400" },
                  ]}
                />
              }
            >
              <Row label="Na mně" value={ops.mine} href="/backlog" />
              {ops.urgent > 0 && <Row label="Urgentní" value={ops.urgent} tone="bad" href="/backlog" />}
              <Row label="Klient čeká na odpověď" value={ops.awaitingReply} tone={ops.awaitingReply ? "warn" : "default"} href="/backlog" />
              <Row label="Nezpracované podklady" value={ops.submissions} tone={ops.submissions ? "warn" : "default"} href="/submissions" />
              <Row label="Domény k obnovení do 30 dní" value={ops.domainsSoon} tone={ops.domainsSoon ? "warn" : "default"} href="/domains" />
              {ops.websWithoutTracking > 0 && <Row label="Weby bez měření" value={ops.websWithoutTracking} tone="warn" href="/clients" />}
            </Area>
          )}

        </div>
      </div>
    </div>
  );
}
