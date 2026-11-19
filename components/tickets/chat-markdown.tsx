"use client";

import { Fragment, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { parseChatMarkdown, parseInline, type ChatBlock } from "@/lib/chat-markdown";
import { parseMessageLinks } from "@/lib/message-links";
import { cn } from "@/lib/utils";

/** Hlasy u zprávy: uid → (číslo seznamu → (číslo bodu → ✓/✗)). */
export type ChatVotes = Record<string, Record<string, Record<string, "yes" | "no">>>;

function Links({ text }: { text: string }) {
  return parseMessageLinks(text).map((p, i) =>
    p.type === "link" ? (
      <a
        key={i}
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("font-medium text-primary underline underline-offset-2 hover:opacity-80", p.text === p.href && "break-all")}
      >
        {p.text}
      </a>
    ) : (
      <Fragment key={i}>{p.text}</Fragment>
    )
  );
}

function Inline({ text }: { text: string }) {
  return parseInline(text).map((p, i) => {
    if (p.type === "code") {
      return (
        <code key={i} className="rounded bg-foreground/[0.07] px-1 py-px font-mono text-[0.86em]">
          {p.text}
        </code>
      );
    }
    if (p.type === "strong") return <strong key={i} className="font-semibold"><Links text={p.text} /></strong>;
    if (p.type === "em") return <em key={i}><Links text={p.text} /></em>;
    return <Links key={i} text={p.text} />;
  });
}

type Verdict = "yes" | "no";

/** Hlasovací tlačítko u bodu: ✓ nebo ✗, s počtem a kdo tak hlasoval. */
function VerdictButton({
  verdict,
  names,
  chosen,
  onClick,
}: {
  verdict: Verdict;
  names: string[];
  chosen: boolean;
  onClick?: () => void;
}) {
  const yes = verdict === "yes";
  const Icon = yes ? Check : X;
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={chosen}
      aria-label={yes ? "Schvaluji" : "Neschvaluji"}
      title={names.length ? `${yes ? "Schvaluje" : "Neschvaluje"}: ${names.join(", ")}` : yes ? "Schvaluji" : "Neschvaluji"}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border px-1.5 text-xs font-semibold tabular-nums transition-colors",
        chosen
          ? yes
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-rose-600 bg-rose-600 text-white"
          : yes
            ? "text-emerald-700 hover:border-emerald-600/50 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            : "text-rose-700 hover:border-rose-600/50 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10",
        !onClick && "cursor-default"
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={3} />
      {names.length > 0 && <span>{names.length}</span>}
    </button>
  );
}

/**
 * Seznam ke schválení: u každého bodu ✓ nebo ✗ od každého z týmu (vybrat jde
 * kolik bodů chcete), druhým klikem hlas zrušíte. Bod, který všichni hlasující
 * schválili, je zelený, bod s aspoň jedním ✗ červený.
 */
function Poll({
  block,
  votes,
  currentUid,
  userNames,
  onVote,
}: {
  block: Extract<ChatBlock, { type: "poll" }>;
  votes: ChatVotes;
  currentUid: string;
  userNames: Record<string, string>;
  onVote?: (poll: number, item: number, verdict: Verdict | null) => void;
}) {
  const poll = String(block.index);
  const mine = votes[currentUid]?.[poll] ?? {};
  const name = (uid: string) => userNames[uid] ?? "Někdo";
  const approved = block.options.filter((o) => {
    const all = Object.values(votes).map((v) => v[poll]?.[o.key]).filter(Boolean);
    return all.length > 0 && all.every((v) => v === "yes");
  }).length;

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex items-baseline justify-between gap-3 border-b px-3 py-2">
        <p className="min-w-0 font-medium whitespace-pre-wrap">{block.question ? <Inline text={block.question} /> : "Ke schválení"}</p>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          Schváleno {approved} z {block.options.length}
        </span>
      </div>
      <ul className="divide-y">
        {block.options.map((o) => {
          const by = (verdict: Verdict) =>
            Object.entries(votes)
              .filter(([, v]) => v[poll]?.[o.key] === verdict)
              .map(([uid]) => name(uid));
          const yes = by("yes");
          const no = by("no");
          const state = no.length ? "no" : yes.length ? "yes" : null;
          const choose = (verdict: Verdict) =>
            onVote ? () => onVote(block.index, Number(o.key), mine[o.key] === verdict ? null : verdict) : undefined;
          return (
            <li key={o.key} className={cn("flex items-start gap-3 px-3 py-2", state === "yes" && "bg-emerald-500/[0.06]", state === "no" && "bg-rose-500/[0.06]")}>
              <span className="min-w-0 flex-1 pt-1 leading-snug">
                <Inline text={o.text} />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <VerdictButton verdict="yes" names={yes} chosen={mine[o.key] === "yes"} onClick={choose("yes")} />
                <VerdictButton verdict="no" names={no} chosen={mine[o.key] === "no"} onClick={choose("no")} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Text zprávy v chatu: Markdown (lib/chat-markdown.ts) a seznamy ke schválení.
 * Bez `onVote` (archiv) jsou seznamy jen ke čtení.
 */
export function ChatMarkdown({
  text,
  votes = {},
  currentUid,
  userNames,
  onVote,
}: {
  text: string;
  votes?: ChatVotes;
  currentUid: string;
  userNames: Record<string, string>;
  onVote?: (poll: number, item: number, verdict: "yes" | "no" | null) => void;
}) {
  const blocks = parseChatMarkdown(text);
  return (
    <div className="space-y-2 break-words">
      {blocks.map((b, i): ReactNode => {
        switch (b.type) {
          case "paragraph":
            return (
              <p key={i} className="whitespace-pre-wrap">
                <Inline text={b.text} />
              </p>
            );
          case "heading":
            return (
              <p key={i} className={cn("font-semibold", b.level === 1 ? "text-base" : "text-[15px]")}>
                <Inline text={b.text} />
              </p>
            );
          case "list": {
            const List = b.ordered ? "ol" : "ul";
            return (
              <List key={i} className={cn("space-y-0.5 pl-5", b.ordered ? "list-decimal" : "list-disc")}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-foreground/20 pl-3 whitespace-pre-wrap text-muted-foreground">
                <Inline text={b.text} />
              </blockquote>
            );
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-zinc-100">
                {b.lang && <span className="mb-1 block text-[10px] tracking-wide text-zinc-400 uppercase">{b.lang}</span>}
                <code>{b.code}</code>
              </pre>
            );
          case "rule":
            return <hr key={i} className="border-foreground/10" />;
          case "poll":
            return <Poll key={i} block={b} votes={votes} currentUid={currentUid} userNames={userNames} onVote={onVote} />;
        }
      })}
    </div>
  );
}
