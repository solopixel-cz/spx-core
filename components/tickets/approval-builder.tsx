"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Markdown seznamu ke schválení (lib/chat-markdown.ts): nadpis a body `- [ ] …`. */
export function approvalMarkdown(title: string, items: string[]): string {
  const lines = items.map((i) => i.trim()).filter(Boolean).map((i) => `- [ ] ${i}`);
  return [title.trim() && `**${title.trim()}**`, ...lines].filter(Boolean).join("\n");
}

/**
 * Skládání seznamu ke schválení v chatu: nadpis a libovolný počet bodů
 * (Enter v bodu přidá další). Výsledek se vloží do zprávy jako Markdown,
 * takže jde ještě upravit, nebo ho napsat rovnou ručně.
 */
export function ApprovalBuilder({ onInsert, onClose }: { onInsert: (markdown: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState(["", ""]);
  const listRef = useRef<HTMLUListElement>(null);
  const filled = items.filter((i) => i.trim()).length;

  function focusItem(index: number) {
    requestAnimationFrame(() => listRef.current?.querySelectorAll("input")[index]?.focus());
  }

  function addItem(after = items.length - 1) {
    setItems([...items.slice(0, after + 1), "", ...items.slice(after + 1)]);
    focusItem(after + 1);
  }

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ke schválení</p>
        <button type="button" onClick={onClose} aria-label="Zavřít" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Co schvalujeme? (nepovinné)"
        aria-label="Nadpis seznamu"
        className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm font-medium outline-none focus:border-ring"
      />
      <ul ref={listRef} className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded border border-muted-foreground/40" />
            <input
              value={item}
              onChange={(e) => setItems(items.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addItem(i);
                } else if (e.key === "Backspace" && !item && items.length > 1) {
                  e.preventDefault();
                  setItems(items.filter((_, j) => j !== i));
                  focusItem(Math.max(0, i - 1));
                }
              }}
              placeholder={`Bod ${i + 1}`}
              aria-label={`Bod ${i + 1}`}
              className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-sm outline-none focus:border-ring"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                aria-label={`Odebrat bod ${i + 1}`}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => addItem()} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
          Přidat bod
        </button>
        <Button type="button" size="sm" disabled={filled === 0} onClick={() => onInsert(approvalMarkdown(title, items))}>
          Vložit do zprávy
        </Button>
      </div>
    </div>
  );
}
