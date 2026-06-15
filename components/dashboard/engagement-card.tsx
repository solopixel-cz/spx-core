"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick } from "lucide-react";

export interface EngagementDay {
  day: string;
  label: string;
  opened: number;
  clicked: number;
}

export function EngagementCard({
  today,
  daily,
}: {
  today: { opened: number; clicked: number };
  daily: EngagementDay[];
}) {
  // Škála pro mini bary — max z otevření i kliknutí napříč dny (min. 1, ať nedělíme nulou)
  const max = Math.max(
    1,
    ...daily.map((d) => Math.max(d.opened, d.clicked))
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Otevření a kliknutí
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Dnes — velká čísla */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-[11px]">Dnes otevřelo</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{today.opened}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <MousePointerClick className="h-3.5 w-3.5" />
              <span className="text-[11px]">Dnes kliklo na demo</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {today.clicked}
            </p>
          </div>
        </div>

        {/* Posledních 7 dní */}
        <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Posledních 7 dní
        </p>
        <div className="space-y-1.5">
          {daily.map((d, i) => {
            const isToday = i === daily.length - 1;
            return (
              <div key={d.day} className="flex items-center gap-2">
                <span
                  className={`w-14 shrink-0 text-[11px] capitalize ${
                    isToday ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {isToday ? "Dnes" : d.label}
                </span>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-sky-500/70"
                        style={{ width: `${(d.opened / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {d.opened}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500/80"
                        style={{ width: `${(d.clicked / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {d.clicked}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded-full bg-sky-500/70" /> otevřelo
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded-full bg-amber-500/80" /> kliklo na demo
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
