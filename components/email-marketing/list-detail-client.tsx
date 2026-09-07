"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Trash2, X } from "lucide-react";

interface Member {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string | null;
  category: string | null;
}

const typeLabels: Record<Member["type"], string> = {
  prospect: "Oslovení",
  client: "Klient",
};

const key = (m: { type: string; id: string }) => `${m.type}:${m.id}`;

export function ListDetailClient({
  list,
  initialMembers,
}: {
  list: { id: string; name: string; description: string | null };
  initialMembers: Member[];
}) {
  const router = useRouter();
  const [name, setName] = useState(list.name);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [candidates, setCandidates] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Kandidáti (prospekti + klienti)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/marketing/contacts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.contacts) setCandidates(data.contacts as Member[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const memberKeys = new Set(members.map(key));

  async function persist(next: Member[]) {
    const prospectIds = next.filter((m) => m.type === "prospect").map((m) => m.id);
    const clientIds = next.filter((m) => m.type === "client").map((m) => m.id);
    const res = await fetch(`/api/marketing/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds, clientIds }),
    });
    if (!res.ok) throw new Error();
  }

  async function addMember(c: Member) {
    if (memberKeys.has(key(c)) || busy) return;
    const prev = members;
    const next = [...members, c].sort((a, b) => a.name.localeCompare(b.name, "cs"));
    setMembers(next);
    setBusy(true);
    try {
      await persist(next);
      router.refresh();
    } catch {
      setMembers(prev);
      toast.error("Nepodařilo se přidat kontakt");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(m: Member) {
    const prev = members;
    const next = members.filter((x) => key(x) !== key(m));
    setMembers(next);
    setBusy(true);
    try {
      await persist(next);
      router.refresh();
    } catch {
      setMembers(prev);
      toast.error("Nepodařilo se odebrat kontakt");
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === list.name) return;
    try {
      const res = await fetch(`/api/marketing/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast.success("Název uložen");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se uložit název");
    }
  }

  async function handleDelete() {
    if (!confirm("Smazat tento seznam?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/lists/${list.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Seznam smazán");
      router.push("/email-marketing");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se smazat");
    } finally {
      setDeleting(false);
    }
  }

  // Kategorie pro filtr
  const categories = [...new Set(candidates.map((c) => c.category).filter(Boolean))].sort(
    (a, b) => a!.localeCompare(b!, "cs")
  ) as string[];

  // Filtrovaní kandidáti (bez už přidaných)
  const q = search.trim().toLowerCase();
  const filtered = candidates.filter((c) => {
    if (memberKeys.has(key(c))) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (q && !(c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)))
      return false;
    return true;
  });
  const shown = filtered.slice(0, 50);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Email marketing", href: "/email-marketing" }, { label: list.name }]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <BackButton href="/email-marketing" className="shrink-0" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-11 max-w-md text-xl font-bold tracking-tight md:text-2xl"
          aria-label="Název seznamu"
        />
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto shrink-0"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Smazat
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Členové */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">V seznamu</h2>
            <span className="text-sm text-muted-foreground">{members.length} kontaktů</span>
          </div>
          {members.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Zatím prázdné — přidej kontakty vpravo.
            </p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => (
                <li key={key(m)} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email || "— bez e-mailu"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {typeLabels[m.type]}
                  </Badge>
                  {m.category && (
                    <Badge variant="secondary" className="shrink-0">
                      {m.category}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    disabled={busy}
                    title="Odebrat"
                    aria-label="Odebrat"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Přidat kontakty */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
          <h2 className="font-semibold">Přidat kontakty</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat jméno nebo e-mail…"
              className="min-w-40 flex-1"
            />
            {categories.length > 0 && (
              <Select
                value={categoryFilter}
                onValueChange={(val) => val && setCategoryFilter(val)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny kategorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Žádní další kontakti
            </p>
          ) : (
            <ul className="divide-y">
              {shown.map((c) => (
                <li key={key(c)} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.email || "— bez e-mailu"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {typeLabels[c.type]}
                  </Badge>
                  {c.category && (
                    <Badge variant="secondary" className="shrink-0">
                      {c.category}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addMember(c)}
                    disabled={busy}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Přidat
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {filtered.length > shown.length && (
            <p className="text-xs text-muted-foreground">
              Zobrazeno {shown.length} z {filtered.length} — zpřesni hledáním.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
