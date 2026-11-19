"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { tagColor } from "@/lib/ticket-labels";
import { cn } from "@/lib/utils";

/** Štítek ticketu. Barva podle textu, stejný štítek má všude stejnou. */
export function TagChip({ tag, onRemove, className }: { tag: string; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium", tagColor(tag), className)}>
      <span className="truncate">{tag}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Odebrat štítek ${tag}`} className="-mr-0.5 rounded-full opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Úprava štítků v detailu: křížkem odebrat, napsat a Enter (nebo čárka)
 * přidat. Nabízí štítky použité u jiných ticketů. Ukládá se hned.
 */
export function TagEditor({
  tags,
  knownTags,
  disabled,
  onSave,
}: {
  tags: string[];
  knownTags: string[];
  disabled: boolean;
  onSave: (tags: string[]) => Promise<boolean>;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const has = (tag: string) => tags.some((t) => t.toLowerCase() === tag.toLowerCase());

  async function save(next: string[]) {
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    return ok;
  }

  async function add() {
    // Existující štítek se převezme i s velikostí písmen, ať se netvoří „Web“ a „web“.
    const typed = draft.trim().replace(/,$/, "").trim();
    const tag = knownTags.find((t) => t.toLowerCase() === typed.toLowerCase()) ?? typed;
    if (!tag) return;
    if (has(tag)) {
      setDraft("");
      return;
    }
    if (await save([...tags, tag])) setDraft("");
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <TagChip key={t} tag={t} onRemove={disabled || busy ? undefined : () => save(tags.filter((o) => o !== t))} />
          ))}
        </div>
      )}
      {!disabled && tags.length < 8 && (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
                e.preventDefault();
                add();
              }
            }}
            list={listId}
            maxLength={24}
            disabled={busy}
            placeholder="Přidat štítek…"
            aria-label="Přidat štítek"
            className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:border-ring"
          />
          <datalist id={listId}>
            {knownTags.filter((t) => !has(t)).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      )}
    </div>
  );
}
