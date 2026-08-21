"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export interface ChartSeries {
  key: string;
  label: string;
  unit: "czk" | "count";
  data: { month: string; value: number }[];
}

// Stabilní paleta — každá metrika má vždy stejnou barvu (dle pořadí v series).
const COLORS = [
  "oklch(0.6 0.118 181)", // teal
  "oklch(0.62 0.19 259)", // modrá
  "oklch(0.68 0.17 145)", // zelená
  "oklch(0.65 0.18 43)", // oranžová
  "oklch(0.6 0.2 320)", // fialová
  "oklch(0.62 0.2 25)", // červená
];

export function DashboardChart({ series }: { series: ChartSeries[] }) {
  const [selected, setSelected] = useState<string[]>(
    () => series.slice(0, 2).map((s) => s.key)
  );
  const [chartType, setChartType] = useState<"bar" | "line">("line");

  if (series.length === 0) return null;

  const colorByKey: Record<string, string> = {};
  const seriesByKey: Record<string, ChartSeries> = {};
  series.forEach((s, i) => {
    colorByKey[s.key] = COLORS[i % COLORS.length];
    seriesByKey[s.key] = s;
  });

  const activeSeries = series.filter((s) => selected.includes(s.key));
  const hasCzk = activeSeries.some((s) => s.unit === "czk");
  const hasCount = activeSeries.some((s) => s.unit === "count");

  // Sloučená data podle měsíce (všechny řady sdílí stejných 12 měsíců).
  const merged = (series[0]?.data ?? []).map((d, i) => {
    const row: Record<string, string | number> = { month: d.month };
    series.forEach((s) => {
      row[s.key] = s.data[i]?.value ?? 0;
    });
    return row;
  });

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const fmt = (key: string, v: number) =>
    seriesByKey[key]?.unit === "czk" ? formatCurrency(v) : v.toLocaleString("cs-CZ");

  const czkAxisFmt = (v: number) =>
    v >= 1000 ? `${Math.round(v / 1000)} tis.` : `${v}`;

  // Kompaktní popisek hodnoty přímo v grafu (aby nebyl potřeba hover).
  const labelFmt = (key: string, v: unknown) => {
    if (typeof v !== "number") return "";
    if (seriesByKey[key]?.unit === "czk") {
      return v >= 1000 ? `${Math.round(v / 1000)} tis.` : `${v}`;
    }
    return v.toLocaleString("cs-CZ");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Vývoj za 12 měsíců</p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={chartType === "bar" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            title="Sloupcový graf"
            aria-label="Sloupcový graf"
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={chartType === "line" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            title="Čárový graf"
            aria-label="Čárový graf"
            onClick={() => setChartType("line")}
          >
            <LineChartIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Přepínače metrik (fungují i jako legenda) */}
      <div className="flex flex-wrap gap-1.5">
        {series.map((s) => {
          const on = selected.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-transparent bg-muted font-medium text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: on ? colorByKey[s.key] : "transparent", borderColor: colorByKey[s.key], borderWidth: on ? 0 : 1.5 }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="w-full min-w-0">
        {activeSeries.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
            Vyber alespoň jednu metriku
          </div>
        ) : (
          <ResponsiveContainer width="99%" height={220}>
            <ComposedChart data={merged} margin={{ top: 22, right: 8, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                minTickGap={4}
              />
              {hasCzk && (
                <YAxis
                  yAxisId="czk"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={44}
                  tickFormatter={czkAxisFmt}
                />
              )}
              {hasCount && (
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={28}
                  allowDecimals={false}
                />
              )}
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, currentColor 8%, transparent)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-md bg-popover px-2 py-1.5 text-xs shadow-md ring-1 ring-border">
                      <div className="mb-1 text-muted-foreground">{label}</div>
                      <div className="space-y-0.5">
                        {payload.map((p) => (
                          <div key={p.dataKey as string} className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-muted-foreground">
                              {seriesByKey[p.dataKey as string]?.label}:
                            </span>
                            <span className="font-medium">
                              {fmt(p.dataKey as string, p.value as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              {activeSeries.map((s) =>
                chartType === "bar" ? (
                  <Bar
                    key={s.key}
                    yAxisId={s.unit}
                    dataKey={s.key}
                    name={s.label}
                    fill={colorByKey[s.key]}
                    radius={[3, 3, 0, 0]}
                  >
                    <LabelList
                      dataKey={s.key}
                      position="top"
                      fontSize={9}
                      fill={colorByKey[s.key]}
                      formatter={(v: unknown) => labelFmt(s.key, v)}
                    />
                  </Bar>
                ) : (
                  <Line
                    key={s.key}
                    yAxisId={s.unit}
                    dataKey={s.key}
                    name={s.label}
                    stroke={colorByKey[s.key]}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: colorByKey[s.key], strokeWidth: 0 }}
                  >
                    <LabelList
                      dataKey={s.key}
                      position="top"
                      fontSize={9}
                      fill={colorByKey[s.key]}
                      formatter={(v: unknown) => labelFmt(s.key, v)}
                    />
                  </Line>
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
