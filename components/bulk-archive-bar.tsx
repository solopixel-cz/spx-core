"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RowSelection } from "@/lib/hooks/use-row-selection";

/** Tvary ve 4. pádě: (archivovat) 1 klienta / 2–4 klienty / 5+ klientů. */
export type Plural = [one: string, few: string, many: string];

export function plural(n: number, [one, few, many]: Plural) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

async function postArchive(action: "archive" | "restore", collection: string, ids: string[]) {
  const res = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, collection, ids }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    done?: string[];
    failed?: Array<{ id: string; error: string }>;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Požadavek selhal");
  return { done: data.done ?? [], failed: data.failed ?? [] };
}

/**
 * Plovoucí lišta hromadné archivace nad seznamem. Zobrazí se, jakmile je
 * něco vybráno. Potvrzení je inline (bez modálu); u vratné archivace nabídne
 * toast „Vrátit zpět". V režimu `restore` (tabulka archivu) nabízí obnovu.
 */
export function BulkArchiveBar({
  collection,
  selection,
  noun,
  warning,
  undoable = true,
  mode = "archive",
  restoreNote,
  onDone,
}: {
  collection: "clients" | "leads" | "tickets" | "prospects";
  selection: RowSelection;
  /** 4. pád, např. ["klienta", "klienty", "klientů"] */
  noun: Plural;
  /** Upozornění v potvrzení (např. kaskáda u klientů). */
  warning?: string;
  /** Nabídnout „Vrátit zpět" v toastu. Vypnout, když archivace není plně vratná. */
  undoable?: boolean;
  /** `archive` = aktivní seznam, `restore` = tabulka archivu. */
  mode?: "archive" | "restore";
  /** Doplňující info v toastu po obnově (např. co se neobnovuje). */
  restoreNote?: string;
  /** Optimistické odebrání zpracovaných řádků z lokálního stavu. */
  onDone?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const ids = selection.selectedIds;
  const count = ids.length;

  if (count === 0) return null;

  async function archive() {
    setBusy(true);
    try {
      const { done, failed } = await postArchive("archive", collection, ids);
      onDone?.(done);
      selection.clear();
      setConfirming(false);

      if (done.length > 0) {
        toast.success(`Archivováno: ${done.length}`, {
          action: undoable
            ? {
                label: "Vrátit zpět",
                onClick: async () => {
                  try {
                    await postArchive("restore", collection, done);
                    toast.success("Obnoveno");
                  } catch {
                    toast.error("Obnovení se nepodařilo, zkuste to přes Nastavení → Archiv");
                  }
                  router.refresh();
                },
              }
            : undefined,
        });
      }
      if (failed.length > 0) {
        toast.error(`Nepodařilo se archivovat ${failed.length} ${plural(failed.length, noun)}`, {
          description: failed[0].error,
        });
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archivace se nepodařila");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    try {
      const { done, failed } = await postArchive("restore", collection, ids);
      onDone?.(done);
      selection.clear();
      if (done.length > 0) {
        toast.success(`Obnoveno: ${done.length}`, { description: restoreNote });
      }
      if (failed.length > 0) {
        toast.error(`Nepodařilo se obnovit ${failed.length} ${plural(failed.length, noun)}`, {
          description: failed[0].error,
        });
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Obnovení se nepodařilo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-20 flex justify-center">
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border bg-popover px-3 py-2 text-sm shadow-lg">
        {confirming ? (
          <>
            <span className="px-1">
              Archivovat {count} {plural(count, noun)}?
              {warning && <span className="block text-xs text-muted-foreground">{warning}</span>}
            </span>
            <Button size="sm" variant="destructive" onClick={archive} disabled={busy}>
              {busy ? "Archivuji..." : "Potvrdit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Zpět
            </Button>
          </>
        ) : (
          <>
            <span className="px-1 font-medium">
              Vybráno: {count}
            </span>
            {mode === "restore" ? (
              <Button size="sm" variant="outline" onClick={restore} disabled={busy}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {busy ? "Obnovuji..." : "Obnovit"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Archivovat
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={selection.clear} aria-label="Zrušit výběr">
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Klikací plocha kolem zaškrtávátka — vyplní padding buňky (a u karty okolí),
 * takže klik „kousek vedle" pořád přepne výběr a neotevře detail řádku
 * (`data-no-row-nav`). Samotný Checkbox je jen vizuál; jeho klik probublá sem.
 */
function CheckboxHitArea({
  onToggle,
  children,
}: {
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <span
      data-no-row-nav
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="-m-3 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-3"
    >
      {children}
    </span>
  );
}

/** Zaškrtávátko „vybrat vše" do hlavičky tabulky. */
export function SelectAllCheckbox({ selection }: { selection: RowSelection }) {
  return (
    <CheckboxHitArea onToggle={selection.toggleAll}>
      <Checkbox
        checked={selection.allSelected}
        indeterminate={selection.someSelected}
        aria-label="Vybrat vše"
      />
    </CheckboxHitArea>
  );
}

/** Zaškrtávátko řádku (tabulka i mobilní karta). */
export function RowCheckbox({ selection, id }: { selection: RowSelection; id: string }) {
  return (
    <CheckboxHitArea onToggle={() => selection.toggle(id)}>
      <Checkbox checked={selection.isSelected(id)} aria-label="Vybrat řádek" />
    </CheckboxHitArea>
  );
}
