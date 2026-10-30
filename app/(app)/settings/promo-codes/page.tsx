"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Power, TicketPercent, Users } from "lucide-react";
import { useRefresh } from "@/components/refresh-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { promoCodeStatus } from "@/lib/status";
import { promoStatus, todayInPrague } from "@/lib/schemas/promo-code";

interface PromoRow {
  code: string;
  description: string | null;
  validUntil: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

interface PromoUse {
  id: string;
  name: string;
  company: string | null;
  createdAt: string | null;
}

interface FormState {
  code: string;
  validUntil: string;
  maxUses: string;
  description: string;
}

/** Výchozí platnost nového kódu: měsíc ode dneška. */
function inAMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return todayInPrague(d);
}

const emptyForm = (): FormState => ({ code: "", validUntil: inAMonth(), maxUses: "", description: "" });

function maxUsesValue(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error && !data.error.startsWith("[") ? data.error : fallback;
}

export default function PromoKodyPage() {
  const [codes, setCodes] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<(FormState & { original: PromoRow }) | null>(null);
  const [usesOf, setUsesOf] = useState<{ code: string; uses: PromoUse[] | null } | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/promo-codes");
      if (res.ok) {
        const data = (await res.json()) as { codes: PromoRow[] };
        // Nejdřív platné, pak podle data platnosti od nejbližšího konce.
        setCodes(
          data.codes.sort((a, b) => {
            const aActive = promoStatus(a) === "active" ? 0 : 1;
            const bActive = promoStatus(b) === "active" ? 0 : 1;
            return aActive - bActive || a.validUntil.localeCompare(b.validUntil);
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useRefresh(fetchCodes);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          validUntil: form.validUntil,
          maxUses: maxUsesValue(form.maxUses),
          description: form.description,
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Kód se nepodařilo vytvořit"));
      const { code } = (await res.json()) as { code: string };
      toast.success(`Kód ${code} vytvořen`);
      setForm(emptyForm());
      fetchCodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kód se nepodařilo vytvořit");
    } finally {
      setCreating(false);
    }
  }

  async function patch(code: string, body: Record<string, unknown>, success: string) {
    const res = await fetch(`/api/promo-codes/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readError(res, "Uložení se nezdařilo"));
    toast.success(success);
    fetchCodes();
  }

  async function handleToggle(promo: PromoRow) {
    setActingKey(`${promo.code}-toggle`);
    try {
      await patch(promo.code, { active: !promo.active }, promo.active ? "Kód vypnut" : "Kód zapnut");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setActingKey(null);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setActingKey(`${editing.original.code}-edit`);
    try {
      await patch(
        editing.original.code,
        {
          validUntil: editing.validUntil,
          maxUses: maxUsesValue(editing.maxUses),
          description: editing.description.trim() || null,
        },
        "Kód upraven",
      );
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setActingKey(null);
    }
  }

  async function handleDelete(code: string) {
    const res = await fetch(`/api/promo-codes/${encodeURIComponent(code)}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await readError(res, "Kód se nepodařilo smazat"));
      return;
    }
    toast.success(`Kód ${code} smazán`);
    fetchCodes();
  }

  async function openUses(code: string) {
    setUsesOf({ code, uses: null });
    const res = await fetch(`/api/promo-codes/${encodeURIComponent(code)}`);
    const data = res.ok ? ((await res.json()) as { uses: PromoUse[] }) : { uses: [] };
    setUsesOf({ code, uses: data.uses });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        backHref="/settings"
        items={[{ label: "Nastavení", href: "/settings" }, { label: "Promo kódy" }]}
      />
      <div>
        <h2 className="text-xl font-semibold">Promo kódy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kódy pro poptávkový formulář na webu. Formulář přijme jen platný kód a každé
          odeslání s kódem se započítá jako použití.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
        <p className="text-sm font-medium">Nový kód</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Kód</Label>
            <Input
              id="promo-code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="LETAK26"
              maxLength={30}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-valid">Platí do (včetně)</Label>
            <Input
              id="promo-valid"
              type="date"
              required
              min={todayInPrague()}
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-max">
              Max. použití <span className="font-normal text-muted-foreground">(nepovinné)</span>
            </Label>
            <Input
              id="promo-max"
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="bez omezení"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-desc">Co kód dává</Label>
          <Input
            id="promo-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="např. Registrace zdarma, leták na veletrhu"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">Interní poznámka pro tým, na webu se neukazuje.</p>
        </div>
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Vytvořit kód
        </Button>
      </form>

      {codes.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title="Zatím žádné promo kódy"
          description="Vytvořte první kód a rozdejte ho třeba na letáku."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kód</TableHead>
                <TableHead>Co dává</TableHead>
                <TableHead>Platí do</TableHead>
                <TableHead>Použito</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="w-48">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((promo) => (
                <TableRow key={promo.code}>
                  <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                    {promo.description}
                  </TableCell>
                  <TableCell>{formatDate(promo.validUntil)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openUses(promo.code)}
                      disabled={promo.usedCount === 0}
                      className="tabular-nums underline-offset-2 enabled:hover:underline disabled:cursor-default"
                      title={promo.lastUsedAt ? `Naposledy ${formatDateTime(promo.lastUsedAt)}` : undefined}
                    >
                      {promo.usedCount}
                      {promo.maxUses != null && <span className="text-muted-foreground"> / {promo.maxUses}</span>}
                    </button>
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={promoCodeStatus} value={promoStatus(promo)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Upravit"
                        onClick={() =>
                          setEditing({
                            original: promo,
                            code: promo.code,
                            validUntil: promo.validUntil,
                            maxUses: promo.maxUses != null ? String(promo.maxUses) : "",
                            description: promo.description ?? "",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={promo.active ? "Vypnout" : "Zapnout"}
                        title={promo.active ? "Vypnout" : "Zapnout"}
                        disabled={actingKey === `${promo.code}-toggle`}
                        onClick={() => handleToggle(promo)}
                      >
                        {actingKey === `${promo.code}-toggle` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      {promo.usedCount > 0 ? (
                        <Button size="sm" variant="ghost" aria-label="Použití" onClick={() => openUses(promo.code)}>
                          <Users className="h-4 w-4" />
                        </Button>
                      ) : (
                        <ConfirmButton
                          variant="ghost"
                          question="Smazat kód?"
                          confirmLabel="Smazat"
                          onConfirm={() => handleDelete(promo.code)}
                        >
                          Smazat
                        </ConfirmButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit kód {editing?.code}</DialogTitle>
            <DialogDescription>Samotný kód změnit nejde, jen jeho platnost a poznámku.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-valid">Platí do (včetně)</Label>
                <Input
                  id="edit-valid"
                  type="date"
                  value={editing.validUntil}
                  onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max">Max. použití</Label>
                <Input
                  id="edit-max"
                  type="number"
                  min={1}
                  value={editing.maxUses}
                  onChange={(e) => setEditing({ ...editing, maxUses: e.target.value })}
                  placeholder="bez omezení"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Co kód dává</Label>
                <Input
                  id="edit-desc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  maxLength={300}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editing?.validUntil || actingKey?.endsWith("-edit")}>
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={usesOf != null} onOpenChange={(open) => !open && setUsesOf(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Použití kódu {usesOf?.code}</DialogTitle>
            <DialogDescription>Poptávky z webu, které kód použily.</DialogDescription>
          </DialogHeader>
          {usesOf?.uses == null ? (
            <Skeleton className="h-24 w-full" />
          ) : usesOf.uses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Poptávky s tímto kódem už jsou smazané.</p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto text-sm">
              {usesOf.uses.map((use) => (
                <li key={use.id} className="flex items-center justify-between gap-4 py-2">
                  <Link href={`/prospects/${use.id}`} className="min-w-0 truncate font-medium hover:underline">
                    {use.name}
                    {use.company && <span className="font-normal text-muted-foreground"> · {use.company}</span>}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">{formatDate(use.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
