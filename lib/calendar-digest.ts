import { addDays, daysBetween, KIND_LABELS, type CalendarEvent } from "@/lib/calendar";

/**
 * Ranní souhrn z kalendáře: co je po termínu, co je dnes a co přijde do týdne.
 * Domény k ručnímu obnovení se navíc ohlásí 30 dní předem (registrátor, platba).
 */

export interface Digest {
  overdue: CalendarEvent[];
  today: CalendarEvent[];
  soon: CalendarEvent[];
}

export const SOON_DAYS = 7;
export const DOMAIN_HEADS_UP_DAYS = 30;

export function buildDigest(events: CalendarEvent[], today: string): Digest {
  const soonEnd = addDays(today, SOON_DAYS);
  return {
    overdue: events.filter((e) => e.state === "todo" && e.day < today),
    today: events.filter((e) => e.state !== "done" && e.day === today),
    soon: events.filter(
      (e) =>
        e.state !== "done" &&
        ((e.day > today && e.day <= soonEnd) ||
          (e.kind === "domain" && e.state === "todo" && daysBetween(today, e.day) === DOMAIN_HEADS_UP_DAYS))
    ),
  };
}

export const digestIsEmpty = (d: Digest) => !d.overdue.length && !d.today.length && !d.soon.length;

/** Krátké shrnutí do notifikace, např. „Dnes 2 · po termínu 1 · do týdne 3“. */
export function digestSummary(d: Digest): string {
  return [
    d.today.length && `Dnes ${d.today.length}`,
    d.overdue.length && `po termínu ${d.overdue.length}`,
    d.soon.length && `brzy ${d.soon.length}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/^./, (c) => c.toUpperCase());
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function czDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
}

const KIND_COLORS: Record<CalendarEvent["kind"], string> = {
  issue: "#0e7490",
  issued: "#64748b",
  due: "#b45309",
  domain: "#7c3aed",
  promo: "#047857",
  cost: "#475569",
  followup: "#0f766e",
  reply: "#a21caf",
  submission: "#047857",
};

/** HTML a text e-mailu se souhrnem. Odkazy vedou do CRM (`origin`). */
export function digestEmail(d: Digest, today: string, origin: string, name: string) {
  const link = (e: CalendarEvent) => `${origin}${e.action?.href ?? e.href}`;
  const section = (title: string, list: CalendarEvent[], withDay: boolean, accent = "#0f172a") =>
    list.length
      ? `<h2 style="margin:24px 0 8px;font-size:15px;color:${accent}">${esc(title)} (${list.length})</h2>` +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">` +
        list
          .map(
            (e) =>
              `<tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;vertical-align:top">` +
              `<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${KIND_COLORS[e.kind]};font-weight:600">${esc(KIND_LABELS[e.kind])}${withDay ? ` · ${esc(czDay(e.day))}` : ""}</div>` +
              `<a href="${esc(link(e))}" style="color:#0f172a;font-weight:600;text-decoration:none">${esc(e.title)}</a>` +
              `<div style="color:#64748b;font-size:13px">${esc(e.detail)}</div></td></tr>`
          )
          .join("") +
        `</table>`
      : "";

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#0f172a;font-size:14px;line-height:1.45">` +
    `<p style="margin:0 0 4px;color:#64748b">${name ? `Dobré ráno, ${esc(name)}.` : "Dobré ráno."} Tohle je dnes v kalendáři CRM.</p>` +
    section("Po termínu", d.overdue, true, "#be123c") +
    section("Dnes", d.today, false) +
    section("Brzy", d.soon, true) +
    `<p style="margin:28px 0 0"><a href="${esc(origin)}/calendar" style="color:#0e7490;font-weight:600">Otevřít kalendář</a></p>` +
    `<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">Ranní souhrn si vypnete v CRM v Kalendáři.</p></div>`;

  const textSection = (title: string, list: CalendarEvent[], withDay: boolean) =>
    list.length
      ? `${title} (${list.length})\n` +
        list.map((e) => `- ${withDay ? `${czDay(e.day)}: ` : ""}${e.title} (${e.detail})\n  ${link(e)}`).join("\n") +
        "\n\n"
      : "";
  const text =
    `${name ? `Dobré ráno, ${name}.` : "Dobré ráno."} Tohle je dnes v kalendáři CRM.\n\n` +
    textSection("Po termínu", d.overdue, true) +
    textSection("Dnes", d.today, false) +
    textSection("Brzy", d.soon, true) +
    `Kalendář: ${origin}/calendar`;

  const [, m, day] = today.split("-").map(Number);
  return { subject: `CRM ${day}. ${m}.: ${digestSummary(d)}`, html, text };
}
