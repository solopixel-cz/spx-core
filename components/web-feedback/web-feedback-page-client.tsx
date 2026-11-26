"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityCard, EntityCardEmpty, EntityCardList } from "@/components/entity-card";
import { PageHeader } from "@/components/page-header";
import { attributionSummary, DIRECT_SOURCE, sourceLabel } from "@/lib/attribution";
import { durationLabel, FEEDBACK_REASONS, reasonLabel, type WebFeedbackRow } from "@/lib/web-feedback";
import { cn } from "@/lib/utils";

function fmtDate(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function sourceText(r: WebFeedbackRow): string {
  return attributionSummary(r.attribution) || sourceLabel(DIRECT_SOURCE);
}

function DeviceIcon({ device }: { device: WebFeedbackRow["device"] }) {
  const Icon = device === "mobile" ? Smartphone : Monitor;
  return <Icon className="h-4 w-4 text-muted-foreground" aria-label={device === "mobile" ? "Mobil" : "Počítač"} />;
}

/** Text odpovědi a kontakt (u kontaktu odkaz na kontakt v Oslovení). */
function Answer({ row }: { row: WebFeedbackRow }) {
  if (!row.message && !row.contact) return <span className="text-muted-foreground">–</span>;
  return (
    <div className="space-y-1">
      {row.message && <p className="whitespace-pre-wrap break-words">{row.message}</p>}
      {row.contact && (
        <p className="text-sm">
          <span className="text-muted-foreground">Kontakt: </span>
          {row.prospectId ? (
            <Link href={`/prospects/${row.prospectId}`} className="relative text-primary hover:underline">
              {row.contact}
            </Link>
          ) : (
            row.contact
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Zpětná vazba z dotazu při odchodu z webu: počty podle důvodu (klik = filtr),
 * odpovědi s textem zvlášť, tabulka na desktopu a karty na mobilu.
 */
export function WebFeedbackPageClient({ rows }: { rows: WebFeedbackRow[] }) {
  const [reason, setReason] = useState("all");
  const [textOnly, setTextOnly] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
    return Object.keys(FEEDBACK_REASONS)
      .map((key) => ({ key, label: reasonLabel(key), count: counts.get(key) ?? 0 }))
      .filter((g) => g.count > 0);
  }, [rows]);
  const withText = rows.filter((r) => r.message).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (reason === "all" || r.reason === reason) &&
        (!textOnly || !!r.message) &&
        (!q ||
          (r.message ?? "").toLowerCase().includes(q) ||
          (r.contact ?? "").toLowerCase().includes(q) ||
          (r.page ?? "").toLowerCase().includes(q)),
    );
  }, [rows, reason, textOnly, query]);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40",
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Zpětná vazba z webu" />

      <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zatím žádné odpovědi. Dotaz se na webu ukáže, když návštěvník odchází (jednou za 30 dní).
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Podle důvodu</span>
              <button type="button" onClick={() => setReason("all")} className={chip(reason === "all")}>
                Vše <span className="tabular-nums opacity-70">{rows.length}</span>
              </button>
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setReason(reason === g.key ? "all" : g.key)}
                  className={chip(reason === g.key)}
                >
                  {g.label} <span className="tabular-nums opacity-70">{g.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Odpověď</span>
              <button type="button" onClick={() => setTextOnly(!textOnly)} className={chip(textOnly)}>
                Jen s textem <span className="tabular-nums opacity-70">{withText}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <Input
        placeholder="Hledat v textu, kontaktu, stránce…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sm:max-w-xs"
      />

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>Žádné odpovědi</EntityCardEmpty>
        ) : (
          filtered.map((r) => (
            <EntityCard
              key={r.id}
              title={reasonLabel(r.reason)}
              badge={<DeviceIcon device={r.device} />}
              subtitle={r.page ?? undefined}
              meta={
                <>
                  <span suppressHydrationWarning>{fmtDate(r.createdAt)}</span>
                  <span>{sourceText(r)}</span>
                  <span>na webu {durationLabel(r.seconds)}</span>
                </>
              }
            >
              {(r.message || r.contact) && (
                <div className="mt-2 text-sm">
                  <Answer row={r} />
                </div>
              )}
            </EntityCard>
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-xl border bg-card px-2 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Kdy</TableHead>
              <TableHead>Důvod</TableHead>
              <TableHead className="w-[32%]">Text a kontakt</TableHead>
              <TableHead>Stránka</TableHead>
              <TableHead>Zdroj</TableHead>
              <TableHead className="text-right">Na webu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Žádné odpovědi</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="tabular-nums text-muted-foreground" suppressHydrationWarning>
                    {fmtDate(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DeviceIcon device={r.device} />
                      {r.reason === "jine" ? <Badge variant="secondary">{reasonLabel(r.reason)}</Badge> : reasonLabel(r.reason)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Answer row={r} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.page ?? "–"}</TableCell>
                  <TableCell className="text-muted-foreground">{sourceText(r)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {durationLabel(r.seconds)}
                    {r.pages !== null && <div className="text-xs">{r.pages} str.</div>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
