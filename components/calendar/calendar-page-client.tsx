"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CalendarSettingsDialog } from "@/components/calendar/calendar-settings-dialog";
import { CHIP, DOT, dayLabel, EventRow, tone, WEEKDAYS } from "@/components/calendar/calendar-event";
import { addDays, isOverdue, type CalendarEvent } from "@/lib/calendar";
import { SOON_DAYS } from "@/lib/calendar-digest";
import { cn } from "@/lib/utils";

function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const text = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("cs-CZ", { month: "long", year: "numeric", timeZone: "UTC" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

function EventList({ title, events, today, showDay, empty, accent }: { title: string; events: CalendarEvent[]; today: string; showDay?: boolean; empty?: string; accent?: string }) {
  if (!events.length && !empty) return null;
  return (
    <Card>
      <CardContent className="space-y-1">
        <h2 className={cn("flex items-baseline justify-between text-sm font-semibold", accent)}>
          {title}
          {events.length > 0 && <span className="text-xs font-normal text-muted-foreground tabular-nums">{events.length}</span>}
        </h2>
        {events.length ? (
          <ul className="divide-y">
            {events.map((e) => (
              <EventRow key={e.id} e={e} today={today} showDay={showDay} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Kalendář CRM: měsíc s událostmi (fakturace, splatnosti, domény, akce,
 * platby služeb) a vedle seznam toho, co je po termínu, vybraný den a nejbližší
 * týden. Vše se počítá z dat CRM (lib/calendar.ts).
 */
export function CalendarPageClient({
  month,
  initialDay,
  today,
  days,
  events,
  feedToken,
  digestEmail,
  email,
  lastRunAt,
}: {
  month: string;
  initialDay: string | null;
  today: string;
  days: string[];
  events: CalendarEvent[];
  feedToken: string | null;
  digestEmail: boolean;
  email: string | null;
  lastRunAt: string | null;
}) {
  const [selected, setSelected] = useState(initialDay ?? (today.startsWith(month) ? today : `${month}-01`));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) map.set(e.day, [...(map.get(e.day) ?? []), e]);
    return map;
  }, [events]);

  const overdue = events.filter((e) => isOverdue(e, today));
  const dayEvents = (byDay.get(selected) ?? []).filter((e) => !isOverdue(e, today));
  const soonEnd = addDays(today, SOON_DAYS);
  const soon = events.filter((e) => e.day > today && e.day <= soonEnd && e.state !== "done" && e.day !== selected);

  // Ranní kontrola běží kolem 6:00 (v létě 7:00); po 9. hodině bez dnešního běhu varujeme.
  const lastRun = lastRunAt ? new Date(lastRunAt) : null;
  const ranToday = lastRun?.toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" }) === today;
  const pragueHour = Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", hour12: false }));
  const runLate = !ranToday && pragueHour >= 9;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalendář"
        action={
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 />
            Google Kalendář a souhrn
          </Button>
        }
      >
        <p className={cn("flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground", runLate && "text-amber-700 dark:text-amber-400")}>
          {runLate && <AlertTriangle className="h-3.5 w-3.5" />}
          {lastRun
            ? `Ranní kontrola: ${lastRun.toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : "Ranní kontrola zatím neproběhla"}
          {runLate && " · dnes ještě neproběhla, zkontrolujte cron na Vercelu"}
          <span aria-hidden="true">·</span>
          <span className={cn(runLate && "text-muted-foreground")}>{digestEmail ? "souhrn chodí i e-mailem" : "souhrn jen v CRM a na zařízení"}</span>
        </p>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <Card className="min-w-0 py-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
              <h2 className="text-base font-semibold">{monthTitle(month)}</h2>
              <div className="flex items-center gap-1">
                {!today.startsWith(month) && (
                  <Button variant="ghost" size="xs" render={<Link href="/calendar" />} nativeButton={false}>
                    Dnes
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" aria-label="Předchozí měsíc" render={<Link href={`/calendar?m=${shiftMonth(month, -1)}`} />} nativeButton={false}>
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Další měsíc" render={<Link href={`/calendar?m=${shiftMonth(month, 1)}`} />} nativeButton={false}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const list = byDay.get(day) ?? [];
                const outside = !day.startsWith(month);
                const isToday = day === today;
                const isSelected = day === selected;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelected(day)}
                    aria-pressed={isSelected}
                    aria-label={`${dayLabel(day, today)}, ${list.length} událostí`}
                    className={cn(
                      "flex min-h-16 min-w-0 flex-col gap-1 border-b p-1 text-left transition-colors hover:bg-muted/50 sm:min-h-28 sm:p-1.5",
                      i % 7 !== 6 && "border-r",
                      i >= days.length - 7 && "border-b-0",
                      outside && "bg-muted/30",
                      isSelected && "bg-primary/[0.06] ring-1 ring-primary/30 ring-inset"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                        outside && "text-muted-foreground/60",
                        isToday && "bg-primary font-semibold text-primary-foreground"
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    {/* Mobil: tečky, větší displej: štítky. */}
                    <span className="flex flex-wrap gap-0.5 sm:hidden">
                      {list.slice(0, 6).map((e) => (
                        <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", DOT[tone(e, today)])} />
                      ))}
                    </span>
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {list.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          title={`${e.title} · ${e.detail}`}
                          className={cn(
                            "relative truncate rounded px-1.5 py-px pl-2.5 text-[11px] leading-4 before:absolute before:inset-y-1 before:left-1 before:w-0.5 before:rounded-full",
                            CHIP[tone(e, today)]
                          )}
                        >
                          {e.title.replace(/^[^:]+:\s*/, "")}
                        </span>
                      ))}
                      {list.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{list.length - 3} další</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <EventList title="Po termínu" events={overdue} today={today} showDay accent="text-rose-700 dark:text-rose-400" />
          <EventList title={dayLabel(selected, today)} events={dayEvents} today={today} empty="Na tento den nic není." />
          {selected === today && <EventList title={`Příštích ${SOON_DAYS} dní`} events={soon} today={today} showDay />}
        </div>
      </div>

      <CalendarSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        feedToken={feedToken}
        digestEmail={digestEmail}
        email={email}
      />
    </div>
  );
}
