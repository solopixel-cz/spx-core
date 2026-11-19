"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DOT, EventRow, tone, WEEKDAYS } from "@/components/calendar/calendar-event";
import { addDays, isOverdue, type CalendarEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const WEEK = 7;

function Section({
  title,
  events,
  today,
  limit,
  showDay,
  accent,
  tint,
  moreHref,
}: {
  title: string;
  events: CalendarEvent[];
  today: string;
  limit: number;
  showDay?: boolean;
  accent?: string;
  /** Podbarvení sekce (po termínu). */
  tint?: string;
  moreHref?: string;
}) {
  if (!events.length) return null;
  const hidden = events.length - limit;
  return (
    <section className={cn(tint && "-mx-2 rounded-lg px-2 py-1", tint)}>
      <h3 className={cn("flex items-baseline justify-between pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", accent)}>
        {title}
        <span className="font-normal tabular-nums">{events.length}</span>
      </h3>
      <ul className="divide-y">
        {events.slice(0, limit).map((e) => (
          <EventRow key={e.id} e={e} today={today} showDay={showDay} compact />
        ))}
      </ul>
      {hidden > 0 &&
        (moreHref ? (
          <Link href={moreHref} className="inline-flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground">
            a další {hidden} <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <p className="py-1 text-xs text-muted-foreground">a další {hidden}</p>
        ))}
    </section>
  );
}

/**
 * „Dnes“ na dashboardu: týden od dneška s tečkami událostí a pod ním co je po
 * termínu, dnes, co čeká na odpověď a co přijde. Na mobilu první věc na stránce.
 */
export function TodayCard({
  agenda,
  inbox,
  today,
  calendarHref,
  className,
  style,
}: {
  agenda: CalendarEvent[];
  inbox: CalendarEvent[];
  today: string;
  /** Odkaz do kalendáře (obchodník kalendář nemá). */
  calendarHref?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const days = Array.from({ length: WEEK }, (_, i) => addDays(today, i));
  const weekEnd = days.at(-1)!;
  const overdue = agenda.filter((e) => isOverdue(e, today));
  const todays = agenda.filter((e) => e.day === today && e.state !== "done");
  const soon = agenda.filter((e) => e.day > today && e.day <= weekEnd && e.state !== "done");
  const replies = inbox.filter((e) => e.kind === "reply");
  const empty = !overdue.length && !todays.length && !inbox.length && !soon.length;
  const todo = overdue.length + todays.filter((e) => e.state === "todo").length + inbox.length;

  return (
    <Card size="sm" id="dnes" className={cn("relative", className)} style={style}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary opacity-70" />
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            Dnes
            {todo > 0 && (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                {todo} k vyřízení
              </span>
            )}
          </h2>
          {calendarHref && (
            <Link href={calendarHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Kalendář <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Týden od dneška. */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const list = [...agenda.filter((e) => e.day === day && e.state !== "done"), ...(day === today ? inbox : [])];
            const weekday = WEEKDAYS[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7];
            const isToday = day === today;
            const cell = (
              <>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">{weekday}</span>
                <span className={cn("text-sm leading-none tabular-nums", isToday && "font-semibold text-primary")}>{Number(day.slice(8))}</span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {list.slice(0, 4).map((e) => (
                    <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", DOT[tone(e, today)])} />
                  ))}
                </span>
              </>
            );
            const cls = cn(
              "flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors",
              isToday && "bg-primary/10 ring-1 ring-primary/30",
              calendarHref && "hover:bg-muted/60"
            );
            return calendarHref ? (
              <Link key={day} href={`${calendarHref}?d=${day}`} title={list.map((e) => e.title).join("\n") || "Nic"} className={cls}>
                {cell}
              </Link>
            ) : (
              <div key={day} className={cls}>
                {cell}
              </div>
            );
          })}
        </div>

        {empty ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
            Nic nehoří. Na dnešek ani na příští dny nic není.
          </p>
        ) : (
          <div className="space-y-2">
            <Section title="Po termínu" events={overdue} today={today} limit={4} showDay accent="text-rose-600 dark:text-rose-400" tint="bg-rose-500/[0.05]" moreHref={calendarHref} />
            <Section title="Na dnešek" events={todays} today={today} limit={5} moreHref={calendarHref ? `${calendarHref}?d=${today}` : undefined} />
            <Section
              title="Čeká na tebe"
              events={inbox}
              today={today}
              limit={4}
              moreHref={replies.length >= inbox.length - replies.length ? "/backlog" : "/submissions"}
            />
            <Section title="Příští dny" events={soon} today={today} limit={3} showDay moreHref={calendarHref} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
