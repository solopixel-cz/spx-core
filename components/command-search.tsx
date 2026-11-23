"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Users, TicketCheck, BookUser, Loader2, Search, CornerDownLeft } from "lucide-react";
import { navGroups, type UserRole } from "@/lib/nav";

interface SearchResults {
  clients: Array<{ id: string; name: string; company?: string }>;
  tickets: Array<{ id: string; title: string; status: string }>;
  prospects: Array<{ id: string; name: string; company?: string; status: string }>;
}

const EMPTY: SearchResults = { clients: [], tickets: [], prospects: [] };

/** Bez diakritiky a velikosti písmen (stejně jako /api/search). */
function norm(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] aria-selected:bg-accent aria-selected:text-accent-foreground";

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  );
}

/**
 * Globální hledání (Cmd+K): klienti (i podle domény vizitky), tickety, oslovení
 * a rychlý přechod na stránky z menu. Bez dotazu nabízí jen stránky.
 */
export function CommandSearch({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(EMPTY);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  // Stránky z menu (podle role), filtrované dotazem.
  const pages = useMemo(() => {
    const q = norm(query.trim());
    return navGroups
      .flatMap((g) => g.items.map((item) => ({ ...item, section: g.title })))
      .filter((item) => !item.roles || item.roles.includes(role))
      .filter((item) => !q || norm(item.label).includes(q));
  }, [query, role]);

  function navigate(path: string) {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  }

  const hasResults =
    results.clients.length > 0 ||
    results.tickets.length > 0 ||
    results.prospects.length > 0 ||
    pages.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Nahoře místo uprostřed: výsledky rostou dolů a okno neposkakuje.
        className="overflow-hidden p-0 sm:top-[12vh] sm:max-w-2xl sm:translate-y-0 sm:pb-0 sm:data-starting-style:translate-y-0 sm:data-ending-style:translate-y-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Hledat</DialogTitle>
        <Command shouldFilter={false} className="rounded-lg">
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Klient, doména, ticket, oslovení nebo stránka…"
              className="flex h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {searching && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
          <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
            {query.length >= 2 && !searching && !hasResults && (
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                Nic nenalezeno
              </Command.Empty>
            )}

            {results.clients.length > 0 && (
              <Group heading="Klienti">
                {results.clients.map((c) => (
                  <Command.Item
                    key={`client-${c.id}`}
                    value={`client-${c.id}`}
                    onSelect={() => navigate(`/clients/${c.id}`)}
                    className={itemClass}
                  >
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                    {c.company && (
                      <span className="truncate text-sm text-muted-foreground">{c.company}</span>
                    )}
                  </Command.Item>
                ))}
              </Group>
            )}

            {results.tickets.length > 0 && (
              <Group heading="Tickety">
                {results.tickets.map((t) => (
                  <Command.Item
                    key={`ticket-${t.id}`}
                    value={`ticket-${t.id}`}
                    onSelect={() => navigate(`/backlog/${t.id}`)}
                    className={itemClass}
                  >
                    <TicketCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </Command.Item>
                ))}
              </Group>
            )}

            {results.prospects.length > 0 && (
              <Group heading="Oslovení">
                {results.prospects.map((p) => (
                  <Command.Item
                    key={`prospect-${p.id}`}
                    value={`prospect-${p.id}`}
                    onSelect={() => navigate(`/prospects/${p.id}`)}
                    className={itemClass}
                  >
                    <BookUser className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                    {p.company && (
                      <span className="truncate text-sm text-muted-foreground">{p.company}</span>
                    )}
                  </Command.Item>
                ))}
              </Group>
            )}

            {pages.length > 0 && (
              <Group heading={query ? "Stránky" : "Přejít na"}>
                {pages.map((item) => (
                  <Command.Item
                    key={`page-${item.href}`}
                    value={`page-${item.href}`}
                    onSelect={() => navigate(item.href)}
                    className={itemClass}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.section && (
                      <span className="text-sm text-muted-foreground">{item.section}</span>
                    )}
                  </Command.Item>
                ))}
              </Group>
            )}
          </Command.List>
          <div className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border bg-card px-1.5 font-sans">↑↓</kbd> výběr
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border bg-card px-1.5 font-sans">
                <CornerDownLeft className="inline h-3 w-3" />
              </kbd>{" "}
              otevřít
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border bg-card px-1.5 font-sans">Esc</kbd> zavřít
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
