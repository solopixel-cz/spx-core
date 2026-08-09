"use client";

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface MiniBarChartProps {
  data: { month: string; amount: number }[];
}

export function MiniBarChart({ data }: MiniBarChartProps) {
  if (data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[60px] items-center justify-center text-xs text-muted-foreground">
        Žádná data
      </div>
    );
  }

  return (
    // min-w-0 + width:0 zabrání recharts ResponsiveContainer roztáhnout rodiče
    // (grid/flex buňku) nad šířku viewportu na mobilu.
    <div className="w-full min-w-0">
      <ResponsiveContainer width="99%" height={60}>
        <BarChart data={data}>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            return (
              <div className="rounded-md bg-popover px-2 py-1 text-xs shadow-md ring-1 ring-border">
                {formatCurrency(payload[0].value as number)}
              </div>
            );
          }}
        />
          <Bar
            dataKey="amount"
            fill="oklch(0.6 0.118 181)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
