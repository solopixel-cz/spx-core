"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/costs";

export type CostsChartRow = { month: string } & Partial<Record<keyof typeof CATEGORY_LABELS, number>>;

// Stabilní barvy kategorií (stejné ve světlém i tmavém režimu).
const COLORS: Record<keyof typeof CATEGORY_LABELS, string> = {
  hosting: "oklch(0.6 0.118 181)", // teal
  cloud: "oklch(0.62 0.19 259)", // modrá
  ai: "oklch(0.6 0.2 300)", // fialová
  domains: "oklch(0.65 0.18 43)", // oranžová
  tools: "oklch(0.7 0.15 85)", // žlutá
  other: "oklch(0.6 0.04 257)", // šedomodrá
};

const SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
const tick = (m: string) => `${SHORT[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;
const axis = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)} tis.` : `${v}`);

/**
 * Náklady za posledních 12 měsíců po kategoriích (skutečnost, jinak plán).
 * Vybraný měsíc je zvýrazněný, klik na sloupec měsíc vybere.
 */
export function CostsChart({
  data,
  categories,
  selected,
  onSelect,
}: {
  data: CostsChartRow[];
  categories: (keyof typeof CATEGORY_LABELS)[];
  selected?: string;
  onSelect?: (month: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
            onClick={(state) => {
              const m = state?.activeLabel;
              if (m && onSelect) onSelect(String(m));
            }}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            <CartesianGrid vertical={false} strokeOpacity={0.15} />
            <XAxis dataKey="month" tickFormatter={tick} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={axis} tickLine={false} axisLine={false} fontSize={12} width={48} />
            <Tooltip
              cursor={{ fillOpacity: 0.06 }}
              labelFormatter={(m) => tick(String(m))}
              formatter={(value, name) => [formatCurrency(Number(value)), CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS]]}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            {categories.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="costs"
                fill={COLORS[c]}
                radius={i === categories.length - 1 ? [4, 4, 0, 0] : 0}
              >
                {data.map((row) => (
                  <Cell key={row.month} fillOpacity={!selected || row.month === selected ? 1 : 0.4} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {categories.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[c] }} />
            {CATEGORY_LABELS[c]}
          </span>
        ))}
      </div>
    </div>
  );
}
