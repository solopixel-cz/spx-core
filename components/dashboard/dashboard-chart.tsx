"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Banknote, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export interface ChartSeries {
  key: string;
  label: string;
  unit: "czk" | "count";
  data: { month: string; value: number }[];
}

// Stabilní barvy metrik (stejné ve světlém i tmavém režimu).
const COLORS: Record<string, string> = {
  invoiced: "oklch(0.62 0.19 259)", // modrá
  revenue: "oklch(0.6 0.118 181)", // teal
  clientsTotal: "oklch(0.6 0.04 257)", // šedomodrá
  activeClients: "oklch(0.6 0.118 181)", // teal
  onboarding: "oklch(0.65 0.18 43)", // oranžová
  subscriptions: "oklch(0.6 0.2 300)", // fialová
};
const FALLBACK = "oklch(0.6 0.04 257)";
const colorOf = (key: string) => COLORS[key] ?? FALLBACK;

// Kratší názvy do legendy (popisky v datech mají jednotky v závorce).
const SHORT: Record<string, string> = {
  invoiced: "Vystaveno",
  revenue: "Přijato",
  clientsTotal: "Všichni klienti",
  activeClients: "Aktivní",
  onboarding: "Onboarding",
  subscriptions: "Předplatná",
};
const shortOf = (s: ChartSeries) => SHORT[s.key] ?? s.label;

const czkAxis = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)} tis.` : `${v}`);
const czkCompact = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} tis. Kč` : formatCurrency(v);

/** Měsíc „MM/RR" → „led 25" pro osu. */
const MONTHS = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
const monthTick = (m: string) => {
  const [mm, yy] = m.split("/");
  const i = Number(mm) - 1;
  return MONTHS[i] ? `${MONTHS[i]} ${yy}` : m;
};

/** Sloučí řady do řádků po měsících (všechny řady sdílí stejných 12 měsíců). */
function mergeRows(series: ChartSeries[]) {
  return (series[0]?.data ?? []).map((d, i) => {
    const row: Record<string, string | number> = { month: d.month };
    series.forEach((s) => {
      row[s.key] = s.data[i]?.value ?? 0;
    });
    return row;
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown; color?: string }[];
  label?: unknown;
  series: ChartSeries[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-lg ring-1 ring-border">
      <div className="mb-1.5 font-medium">{monthTick(String(label))}</div>
      <div className="space-y-1">
        {payload.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          if (!s) return null;
          const v = Number(p.value) || 0;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(s.key) }} />
              <span className="text-muted-foreground">{shortOf(s)}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums">
                {s.unit === "czk" ? formatCurrency(v) : v.toLocaleString("cs-CZ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Výška obou grafů (vedle sebe od šířky xl, jinak pod sebou). */
const CHART_HEIGHT = 260;

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

/** Finance: vystavené faktury vs. přijaté platby po měsících (sloupce vedle sebe). */
function FinanceChart({ series }: { series: ChartSeries[] }) {
  const rows = mergeRows(series);
  const totals = series.map((s) => ({ s, sum: s.data.reduce((a, d) => a + d.value, 0) }));

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Banknote className="h-4 w-4" />
          </span>
          Finance za 12 měsíců
        </CardTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
          {totals.map(({ s, sum }) => (
            <div key={s.key}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: colorOf(s.key) }} />
                {shortOf(s)}
              </p>
              <p className="font-heading text-lg font-bold tabular-nums">{czkCompact(sum)}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 pt-0">
        <ResponsiveContainer width="99%" height={CHART_HEIGHT}>
          <BarChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={monthTick} minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} width={48} tickFormatter={czkAxis} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, currentColor 6%, transparent)" }}
              content={(p) => <ChartTooltip {...p} series={series} />}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={colorOf(s.key)} radius={[4, 4, 0, 0]} maxBarSize={20} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** Klienti: vývoj počtů v čase; metriky se zapínají v legendě, která ukazuje aktuální hodnotu. */
function ClientsChart({ series }: { series: ChartSeries[] }) {
  const [selected, setSelected] = useState<string[]>(() =>
    series.filter((s) => s.key === "activeClients" || s.key === "subscriptions").map((s) => s.key)
  );
  const rows = mergeRows(series);
  const active = series.filter((s) => selected.includes(s.key));

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Users className="h-4 w-4" />
          </span>
          Klienti a předplatná
        </CardTitle>
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          {series.map((s) => {
            const on = selected.includes(s.key);
            const current = s.data[s.data.length - 1]?.value ?? 0;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                  on ? "border-transparent bg-muted" : "border-dashed opacity-60 hover:opacity-100"
                )}
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(s.key) }} />
                  {shortOf(s)}
                </span>
                <span className="font-heading text-lg font-bold tabular-nums">{current.toLocaleString("cs-CZ")}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 pt-0">
        {active.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            Vyber alespoň jednu metriku
          </div>
        ) : (
          <ResponsiveContainer width="99%" height={CHART_HEIGHT}>
            <AreaChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                {active.map((s) => (
                  <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorOf(s.key)} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={colorOf(s.key)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={monthTick} minTickGap={8} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} width={32} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={(p) => <ChartTooltip {...p} series={series} />}
              />
              {active.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={colorOf(s.key)}
                  strokeWidth={2}
                  fill={`url(#fill-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Grafy na dashboardu: finance (Kč) a klienti (počty) zvlášť; na širokém displeji vedle sebe, jinak pod sebou. */
export function DashboardCharts({ series }: { series: ChartSeries[] }) {
  if (series.length === 0) return null;
  const finance = series.filter((s) => s.unit === "czk");
  const counts = series.filter((s) => s.unit === "count");
  return (
    <div className="grid min-w-0 gap-3 md:gap-4 xl:grid-cols-2">
      {finance.length > 0 && <FinanceChart series={finance} />}
      {counts.length > 0 && <ClientsChart series={counts} />}
    </div>
  );
}
