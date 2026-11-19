"use client";

import Link from "next/link";
import { AlertTriangle, Check, ClipboardList, Clock, FileCheck2, Globe, MessageSquare, Phone, Receipt, Tag, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, isOverdue, KIND_LABELS, type CalendarEvent, type CalendarKind } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/** Společné části kalendáře: barvy podle druhu, popisky dnů a řádek události (stránka i widget na dashboardu). */

export const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export const KIND_ICONS: Record<CalendarKind, typeof Receipt> = {
  issue: Receipt,
  issued: FileCheck2,
  due: Clock,
  domain: Globe,
  promo: Tag,
  cost: Wallet,
  followup: Phone,
  reply: MessageSquare,
  submission: ClipboardList,
};

/** Barva podle druhu; úkol po termínu je vždy červený, hotové šedé. */
export function tone(e: CalendarEvent, today: string): string {
  if (isOverdue(e, today)) return "rose";
  if (e.state === "done") return "zinc";
  return (
    {
      issue: "sky",
      issued: "zinc",
      due: "amber",
      domain: "violet",
      promo: "emerald",
      cost: "slate",
      followup: "teal",
      reply: "fuchsia",
      submission: "emerald",
    } as const
  )[e.kind];
}

export const CHIP: Record<string, string> = {
  rose: "bg-rose-500/10 text-rose-700 before:bg-rose-500 dark:text-rose-300",
  zinc: "bg-muted text-muted-foreground line-through decoration-muted-foreground/40 before:bg-zinc-400",
  sky: "bg-sky-500/10 text-sky-800 before:bg-sky-500 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-800 before:bg-amber-500 dark:text-amber-300",
  violet: "bg-violet-500/10 text-violet-800 before:bg-violet-500 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-800 before:bg-emerald-500 dark:text-emerald-300",
  slate: "bg-slate-500/10 text-slate-700 before:bg-slate-500 dark:text-slate-300",
  teal: "bg-teal-500/10 text-teal-800 before:bg-teal-500 dark:text-teal-300",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-800 before:bg-fuchsia-500 dark:text-fuchsia-300",
};

export const ICON: Record<string, string> = {
  rose: "bg-rose-500/10 text-rose-600",
  zinc: "bg-muted text-muted-foreground",
  sky: "bg-sky-500/10 text-sky-600",
  amber: "bg-amber-500/10 text-amber-600",
  violet: "bg-violet-500/10 text-violet-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  slate: "bg-slate-500/10 text-slate-600",
  teal: "bg-teal-500/10 text-teal-600",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600",
};

export const DOT: Record<string, string> = {
  rose: "bg-rose-500",
  zinc: "bg-zinc-400",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  slate: "bg-slate-500",
  teal: "bg-teal-500",
  fuchsia: "bg-fuchsia-500",
};

export function dayLabel(day: string, today: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const text = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
  if (day === today) return `Dnes, ${text}`;
  if (day === addDays(today, 1)) return `Zítra, ${text}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Krátký popis dne: Dnes, Zítra, st 25. 11. */
export function shortDay(day: string, today: string): string {
  if (day === today) return "Dnes";
  if (day === addDays(today, 1)) return "Zítra";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
}

/** Řádek události; `compact` = hustší varianta pro widget (texty na jeden řádek). */
export function EventRow({ e, today, showDay, compact }: { e: CalendarEvent; today: string; showDay?: boolean; compact?: boolean }) {
  const t = tone(e, today);
  const Icon = e.state === "done" ? Check : isOverdue(e, today) ? AlertTriangle : KIND_ICONS[e.kind];
  return (
    <li className={cn("flex items-start", compact ? "gap-2.5 py-2" : "gap-3 py-2.5")}>
      <span className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-full", compact ? "h-6 w-6" : "h-7 w-7", ICON[t])}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {KIND_LABELS[e.kind]}
          {showDay && ` · ${compact ? shortDay(e.day, today) : dayLabel(e.day, today)}`}
        </p>
        <Link href={e.href} className={cn("block text-sm leading-snug font-medium hover:underline", compact && "truncate", e.state === "done" && "text-muted-foreground line-through")}>
          {e.title}
        </Link>
        {e.detail && <p className={cn("text-xs text-muted-foreground", compact && "truncate")}>{e.detail}</p>}
      </div>
      {e.action && (
        <Button size="xs" variant={isOverdue(e, today) || e.day === today ? "default" : "outline"} render={<Link href={e.action.href} />} nativeButton={false}>
          {e.action.label}
        </Button>
      )}
    </li>
  );
}
