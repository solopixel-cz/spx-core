"use client";

import { Banknote, FileText, Repeat, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  key: string;
  label: string;
  unit: "czk" | "count";
  data: { month: string; value: number }[];
}

const MONTHS = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
/** „MM/RR“ → „lis 26“. */
const monthLabel = (m: string) => {
  const [mm, yy] = m.split("/");
  return `${MONTHS[Number(mm) - 1] ?? mm} ${yy}`;
};

const compactCzk = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} tis. Kč` : formatCurrency(v);

/** Malý graf za 12 měsíců: sloupečky (peníze) nebo křivka s plochou (počty). Hodnota měsíce v title. */
function Spark({ series, kind, unit }: { series: ChartSeries; kind: "bars" | "line"; unit: "czk" | "count" }) {
  const W = 120;
  const H = 32;
  const values = series.data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = kind === "line" ? Math.min(...values) : 0;
  const span = Math.max(max - min, 1);
  const y = (v: number) => H - 2 - ((v - min) / span) * (H - 6);
  const fmt = (v: number) => (unit === "czk" ? formatCurrency(v) : v.toLocaleString("cs-CZ"));

  if (kind === "bars") {
    const step = W / values.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
        {series.data.map((d, i) => {
          const top = y(d.value);
          return (
            <rect
              key={d.month}
              x={i * step + step * 0.18}
              y={top}
              width={step * 0.64}
              height={Math.max(H - 2 - top, d.value > 0 ? 1.5 : 0.75)}
              rx={1}
              className={cn("fill-current", i === values.length - 1 ? "opacity-100" : "opacity-45")}
            >
              <title>{`${monthLabel(d.month)}: ${fmt(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
    );
  }

  const pts = series.data.map((d, i) => [(i / (values.length - 1)) * W, y(d.value)] as const);
  const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const last = pts.at(-1)!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-full overflow-visible" aria-hidden="true">
      <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-current opacity-[0.12]" />
      <polyline points={line} fill="none" strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-current" />
      <circle cx={last[0]} cy={last[1]} r={2.5} vectorEffect="non-scaling-stroke" className="fill-current" />
      <title>{series.data.map((d) => `${monthLabel(d.month)}: ${fmt(d.value)}`).join("\n")}</title>
    </svg>
  );
}

interface TileDef {
  key: string;
  title: string;
  icon: typeof Users;
  color: string;
  kind: "bars" | "line";
}

const TILES: TileDef[] = [
  { key: "invoiced", title: "Vystaveno za rok", icon: FileText, color: "text-sky-500", kind: "bars" },
  { key: "revenue", title: "Přijato za rok", icon: Banknote, color: "text-emerald-500", kind: "bars" },
  { key: "activeClients", title: "Aktivní klienti", icon: Users, color: "text-primary", kind: "line" },
  { key: "subscriptions", title: "Předplatná", icon: Repeat, color: "text-violet-500", kind: "line" },
];

/**
 * Vývoj za 12 měsíců v malých dlaždicích: peníze jako součet za rok se sloupečky
 * po měsících, počty jako aktuální stav s křivkou a změnou za rok.
 */
export function TrendTiles({ series, className, style }: { series: ChartSeries[]; className?: string; style?: React.CSSProperties }) {
  const tiles = TILES.flatMap((t) => {
    const s = series.find((x) => x.key === t.key);
    return s && s.data.length > 1 ? [{ t, s }] : [];
  });
  if (!tiles.length) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4", className)} style={style}>
      {tiles.map(({ t, s }) => {
        const values = s.data.map((d) => d.value);
        const current = values.at(-1) ?? 0;
        const money = s.unit === "czk";
        const value = money ? values.reduce((a, b) => a + b, 0) : current;
        const delta = current - values[0];
        const hint = money
          ? `tento měsíc ${compactCzk(current)}`
          : delta === 0
            ? "beze změny za rok"
            : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} za rok`;
        return (
          <Card key={t.key} size="sm" className="min-w-0">
            <CardContent className="@container space-y-2">
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <t.icon className={cn("h-3.5 w-3.5 shrink-0", t.color)} />
                {t.title}
              </p>
              <div className="flex flex-col gap-2 @[13rem]:flex-row @[13rem]:items-end @[13rem]:justify-between @[13rem]:gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-xl leading-none font-bold whitespace-nowrap tabular-nums">{money ? compactCzk(value) : value.toLocaleString("cs-CZ")}</p>
                  <p
                    className={cn(
                      "mt-1 truncate text-xs tabular-nums",
                      !money && delta > 0 ? "text-emerald-600 dark:text-emerald-400" : !money && delta < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                    )}
                  >
                    {hint}
                  </p>
                </div>
                <div className={cn("w-full shrink-0 @[13rem]:w-[42%] @[13rem]:max-w-32", t.color)}>
                  <Spark series={s} kind={t.kind} unit={s.unit} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
