"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Users, Briefcase, TicketCheck, BookUser } from "lucide-react";

interface SearchResults {
  clients: Array<{ id: string; name: string; company?: string }>;
  leads: Array<{ id: string; name: string; company?: string; stage: string }>;
  tickets: Array<{ id: string; title: string; status: string }>;
  prospects: Array<{ id: string; name: string; company?: string; status: string }>;
}

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    leads: [],
    tickets: [],
    prospects: [],
  });

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ clients: [], leads: [], tickets: [], prospects: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  function navigate(path: string) {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  }

  const hasResults =
    results.clients.length > 0 ||
    results.leads.length > 0 ||
    results.tickets.length > 0 ||
    results.prospects.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <Command shouldFilter={false} className="rounded-lg">
          <div className="flex items-center border-b px-3">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Hledat klienty, leady, prospekty, tickety..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {query.length >= 2 && !hasResults && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Nic nenalezeno
              </Command.Empty>
            )}

            {results.clients.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-medium text-muted-foreground">
                    Klienti
                  </span>
                }
              >
                {results.clients.map((c) => (
                  <Command.Item
                    key={`client-${c.id}`}
                    onSelect={() => navigate(`/klienti/${c.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{c.name}</span>
                    {c.company && (
                      <span className="text-muted-foreground">
                        — {c.company}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.leads.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-medium text-muted-foreground">
                    Leady
                  </span>
                }
              >
                {results.leads.map((l) => (
                  <Command.Item
                    key={`lead-${l.id}`}
                    onSelect={() => navigate("/leady")}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
                  >
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{l.name}</span>
                    {l.company && (
                      <span className="text-muted-foreground">
                        — {l.company}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.tickets.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-medium text-muted-foreground">
                    Tickety
                  </span>
                }
              >
                {results.tickets.map((t) => (
                  <Command.Item
                    key={`ticket-${t.id}`}
                    onSelect={() => navigate("/tickety")}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
                  >
                    <TicketCheck className="h-4 w-4 text-muted-foreground" />
                    <span>{t.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {results.prospects.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-medium text-muted-foreground">
                    Prospekti
                  </span>
                }
              >
                {results.prospects.map((p) => (
                  <Command.Item
                    key={`prospect-${p.id}`}
                    onSelect={() => navigate("/prospekti")}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
                  >
                    <BookUser className="h-4 w-4 text-muted-foreground" />
                    <span>{p.name}</span>
                    {p.company && (
                      <span className="text-muted-foreground">
                        — {p.company}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
