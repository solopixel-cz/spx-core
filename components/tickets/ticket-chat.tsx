"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Code2, ListChecks, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TicketComment } from "@/lib/ticket-route";
import { ChatMarkdown, type ChatVotes } from "@/components/tickets/chat-markdown";
import { ApprovalBuilder } from "@/components/tickets/approval-builder";

/** Zprávy jednoho autora do 5 minut tvoří skupinu (jméno a čas jednou, bubliny pod sebou). */
const GROUP_GAP_MS = 5 * 60_000;

const CODE_TEMPLATE = "```\n\n```";

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const time = (c: TicketComment) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);

function groupComments(comments: TicketComment[]): TicketComment[][] {
  const groups: TicketComment[][] = [];
  for (const c of comments) {
    const last = groups.at(-1);
    const prev = last?.at(-1);
    if (last && prev && prev.authorUid === c.authorUid && time(c) - time(prev) < GROUP_GAP_MS) last.push(c);
    else groups.push([c]);
  }
  return groups;
}

/**
 * Chat u ticketu, inspirovaný iMessage, ale stavěný na čtení i technických
 * dotazů: vlastní zprávy vpravo, ostatních vlevo, široké bubliny, Markdown
 * (kód, seznamy, tučně) a seznamy ke schválení (u každého bodu ✓ nebo ✗).
 * Klient chat nevidí. Enter = nový řádek, Ctrl/⌘+Enter odešle.
 */
export function TicketChat({
  ticketId,
  comments,
  currentUid,
  users,
  disabled,
}: {
  ticketId: string;
  comments: TicketComment[];
  currentUid: string;
  users: { id: string; name: string }[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [building, setBuilding] = useState(false);
  // Hlas se ukáže hned, server ho potvrdí obnovením stránky.
  const [votes, setVotes] = useState<Record<string, ChatVotes>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // Jako v chatu: vždy vidět poslední zprávu.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  /** Vloží blok na místo kurzoru (na vlastní řádek); `caret` = kam dát kurzor v bloku, jinak za něj. */
  function insert(snippet: string, caret = snippet.length) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const pad = before && !before.endsWith("\n") ? "\n" : "";
    setText(before + pad + snippet + text.slice(end));
    const cursor = before.length + pad.length + caret;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setText("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Zprávu se nepodařilo odeslat");
    } finally {
      setSending(false);
    }
  }

  async function vote(comment: TicketComment, poll: number, item: number, verdict: "yes" | "no" | null) {
    const current = votes[comment.id] ?? comment.votes;
    const list = { ...(current[currentUid]?.[poll] ?? {}) };
    if (verdict) list[item] = verdict;
    else delete list[item];
    const mine = { ...(current[currentUid] ?? {}), [poll]: list };
    setVotes((v) => ({ ...v, [comment.id]: { ...current, [currentUid]: mine } }));
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${comment.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll, item, verdict }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      router.refresh();
    } catch (error) {
      setVotes((v) => ({ ...v, [comment.id]: current }));
      toast.error(error instanceof Error && error.message ? error.message : "Hlas se nepodařilo uložit");
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Chat</h2>
        <span className="text-xs text-muted-foreground">Klient ho nevidí</span>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background">
        <div ref={scrollRef} className="max-h-[36rem] space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Zatím žádné zprávy. Napište dotaz, poznámku nebo pošlete seznam ke schválení.
            </p>
          ) : (
            groupComments(comments).map((group) => {
              const first = group[0];
              const own = first.authorUid === currentUid;
              return (
                <div key={first.id} className={cn("flex items-start gap-2", own && "flex-row-reverse")}>
                  <span
                    title={first.authorName}
                    className={cn(
                      "mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      own ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {initials(first.authorName)}
                  </span>
                  <div className={cn("flex min-w-0 max-w-[88%] flex-col gap-1", own ? "items-end" : "items-start")}>
                    <p className="px-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{first.authorName}</span> · {formatDateTime(first.createdAt)}
                    </p>
                    {group.map((c, i) => (
                      <div
                        key={c.id}
                        title={formatDateTime(c.createdAt)}
                        className={cn(
                          "max-w-full rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          own ? "bg-primary/[0.07] ring-1 ring-primary/15" : "bg-muted/70",
                          i === 0 && (own ? "rounded-tr-md" : "rounded-tl-md")
                        )}
                      >
                        <ChatMarkdown
                          text={c.text}
                          votes={votes[c.id] ?? c.votes}
                          currentUid={currentUid}
                          userNames={userNames}
                          onVote={disabled ? undefined : (poll, item, verdict) => vote(c, poll, item, verdict)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!disabled && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="space-y-1.5 border-t p-2.5"
          >
            {building && (
              <ApprovalBuilder
                onClose={() => setBuilding(false)}
                onInsert={(markdown) => {
                  insert(markdown);
                  setBuilding(false);
                }}
              />
            )}
            <div className="flex items-end gap-2 rounded-2xl border bg-background py-1.5 pr-1.5 pl-3 focus-within:border-ring">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Zpráva"
                aria-label="Zpráva do chatu"
                className="field-sizing-content max-h-72 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                title="Odeslat (Ctrl/⌘ + Enter)"
                aria-label="Odeslat"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.75} />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setBuilding(true)}
                aria-expanded={building}
                className="flex items-center gap-1 font-medium hover:text-foreground"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Ke schválení
              </button>
              <button type="button" onClick={() => insert(CODE_TEMPLATE, 4)} className="flex items-center gap-1 font-medium hover:text-foreground">
                <Code2 className="h-3.5 w-3.5" />
                Kód
              </button>
              <span className="ml-auto">
                Markdown: <code className="font-mono">**tučně**</code>, <code className="font-mono">`kód`</code>, <code className="font-mono">- seznam</code> · Ctrl/⌘+Enter odešle
              </span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
