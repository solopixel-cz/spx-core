"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Eye, Globe, Info, Loader2, Plus, RefreshCw, SlidersHorizontal, Star, TriangleAlert, X } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/form-actions";
import { useFormRouter } from "@/components/form-modal";
import { normalizeHost, withWww } from "@/lib/card-hosts";
import { instanceStatusLabels } from "@/lib/schemas/instance";
import { cn } from "@/lib/utils";

interface Initial {
  hostnames: string[];
  primaryHost: string | null;
  leadEmail: string;
  ga4MeasurementId: string;
  googleSiteVerification: string;
  frameAncestors: string[];
}

interface HostStatus {
  name: string;
  error?: string;
  inProject?: boolean;
  verified?: boolean;
  misconfigured?: boolean;
  verification?: { type: string; domain: string; value: string }[];
  record?: { type: "A" | "CNAME"; value: string | null };
}

function statusOf(s: HostStatus | undefined, saved: boolean) {
  if (!saved) return { label: "Po uložení", tone: "outline" as const };
  if (!s) return { label: "Ověřuji…", tone: "outline" as const };
  if (s.error) return { label: "Chyba", tone: "destructive" as const };
  if (!s.inProject) return { label: "Není ve Vercelu", tone: "destructive" as const };
  if (!s.verified) return { label: "Ověřit vlastnictví", tone: "destructive" as const };
  if (s.misconfigured) return { label: "Nastavit DNS", tone: "destructive" as const };
  return { label: "Funguje", tone: "default" as const };
}

/** Nasazení vizitky (spx-dbc v2): adresy, stav DNS a nastavení z CRM. */
export function CardDeploymentForm({
  instanceId,
  backHref,
  fallbackUrl,
  status,
  vercel,
  isAdmin,
  clientEmail,
  clientDomains,
  initial,
}: {
  instanceId: string;
  backHref: string;
  fallbackUrl: string;
  status: string;
  vercel: boolean;
  isAdmin: boolean;
  clientEmail?: string;
  clientDomains: string[];
  initial: Initial;
}) {
  const router = useFormRouter();
  const [hosts, setHosts] = useState(initial.hostnames);
  const [saved, setSaved] = useState(initial.hostnames);
  const [primary, setPrimary] = useState(initial.primaryHost ?? initial.hostnames[0] ?? null);
  const [newHost, setNewHost] = useState("");
  const [leadEmail, setLeadEmail] = useState(initial.leadEmail);
  const [ga4, setGa4] = useState(initial.ga4MeasurementId);
  const [verification, setVerification] = useState(initial.googleSiteVerification);
  const [frames, setFrames] = useState(initial.frameAncestors.join("\n"));
  const [statuses, setStatuses] = useState<Record<string, HostStatus>>({});
  const [checking, setChecking] = useState(vercel && initial.hostnames.length > 0);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [reload, setReload] = useState(0);

  // Stav adres ve Vercelu; `reload` ho načte znovu (po uložení, tlačítko Ověřit DNS)
  useEffect(() => {
    if (!vercel) return;
    let cancelled = false;
    fetch(`/api/instances/${instanceId}/deployment`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { hosts?: HostStatus[]; error?: string };
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setStatuses(Object.fromEntries((data.hosts ?? []).map((h) => [h.name, h])));
      })
      .catch((e) => toast.error(e instanceof Error && e.message ? e.message : "Stav domén se nepodařilo načíst"))
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId, vercel, reload]);

  function loadStatus() {
    if (!vercel) return;
    setChecking(true);
    setReload((n) => n + 1);
  }

  function addHost(raw: string) {
    const host = normalizeHost(raw);
    if (!host) {
      toast.error(`Neplatná adresa „${raw}"`);
      return;
    }
    const next = [...hosts];
    for (const h of withWww(host)) if (!next.includes(h)) next.push(h);
    setHosts(next);
    if (!primary) setPrimary(host);
    setNewHost("");
  }

  function removeHost(host: string) {
    const next = hosts.filter((h) => h !== host);
    setHosts(next);
    if (primary === host) setPrimary(next.find((h) => !h.startsWith("www.")) ?? next[0] ?? null);
  }

  async function onSubmit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/instances/${instanceId}/deployment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostnames: hosts,
          primaryHost: primary,
          leadEmail,
          ga4MeasurementId: ga4,
          googleSiteVerification: verification,
          frameAncestors: frames.split(/\s+/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = (await res.json()) as { error?: string; warnings?: string[]; vercel?: boolean };
      if (!res.ok) throw new Error(data.error);
      setSaved(hosts);
      if (data.warnings?.length) {
        data.warnings.forEach((w) => toast.warning(w, { duration: 10000 }));
      } else {
        toast.success(data.vercel ? "Uloženo a propsáno do Vercelu" : "Uloženo do CRM");
      }
      router.refresh();
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Uložení se nepodařilo");
    } finally {
      setSaving(false);
    }
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const res = await fetch("/api/instances/sync", { method: "POST" });
      const data = (await res.json()) as { error?: string; cards?: number; hosts?: number; warnings?: string[] };
      if (!res.ok) throw new Error(data.error);
      data.warnings?.forEach((w) => toast.warning(w, { duration: 10000 }));
      toast.success(`Synchronizováno: ${data.cards} vizitek, ${data.hosts} adres`);
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Synchronizace se nepodařila");
    } finally {
      setSyncing(false);
    }
  }

  const suggestions = clientDomains.filter((d) => !hosts.includes(d));

  return (
    <div className="space-y-6">
      {(!vercel || status !== "live") && (
        <div className="grid gap-3 lg:grid-cols-2">
          {!vercel && (
            <p className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Vercel zatím není napojený (chybí env). Nastavení se uloží jen do CRM a do Vercelu se propíše
                po napojení přes „Synchronizovat všechny vizitky“.
              </span>
            </p>
          )}
          {status !== "live" && (
            <p className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Vizitka je ve stavu <strong className="text-foreground">{instanceStatusLabels[status] ?? status}</strong>.
                {status === "offline"
                  ? " Na všech adresách se místo ní ukáže stránka, že vizitka není aktivní."
                  : " Na vlastních adresách se ukáže až ve stavu Živá, záložní adresa funguje vždy."}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Adresy
            </CardTitle>
            <CardDescription>
              Hvězdička = hlavní adresa, ostatní na ni přesměrují. K doméně se automaticky přidá i www.
            </CardDescription>
            {vercel && saved.length > 0 && (
              <CardAction>
                <Button type="button" variant="ghost" size="sm" onClick={loadStatus} disabled={checking}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", checking && "animate-spin")} />
                  Ověřit DNS
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {hosts.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {hosts.map((host) => {
                  const s = statuses[host];
                  const st = statusOf(s, saved.includes(host));
                  const isPrimary = primary === host;
                  return (
                    <li key={host} className="space-y-2 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={isPrimary ? "Hlavní adresa" : "Nastavit jako hlavní"}
                          title={isPrimary ? "Hlavní adresa" : "Nastavit jako hlavní"}
                          onClick={() => setPrimary(host)}
                          className={cn(
                            "shrink-0 rounded p-1",
                            isPrimary ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground"
                          )}
                        >
                          <Star className={cn("h-4 w-4", isPrimary && "fill-current")} />
                        </button>
                        <a
                          href={`https://${host}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate font-medium hover:underline"
                        >
                          {host}
                        </a>
                        {!isPrimary && primary && (
                          <span className="hidden text-xs text-muted-foreground sm:inline">→ {primary}</span>
                        )}
                        <Badge variant={st.tone}>{st.label}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Odebrat ${host}`}
                          onClick={() => removeHost(host)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {s?.error && <p className="text-xs text-destructive">{s.error}</p>}
                      {s && !s.error && s.inProject && !s.verified && s.verification?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Doména je ověřená v jiném Vercel účtu. Přidejte TXT záznam{" "}
                          <code className="rounded bg-muted px-1">{s.verification[0].domain}</code> s hodnotou{" "}
                          <code className="break-all rounded bg-muted px-1">{s.verification[0].value}</code>.
                        </p>
                      ) : null}
                      {s && !s.error && s.verified && s.misconfigured && s.record?.value && (
                        <p className="text-xs text-muted-foreground">
                          U registrátora nastavte záznam{" "}
                          <code className="rounded bg-muted px-1">{s.record.type}</code>{" "}
                          <code className="rounded bg-muted px-1">
                            {s.record.type === "A" ? "@" : host.split(".")[0]}
                          </code>{" "}
                          → <code className="rounded bg-muted px-1">{s.record.value}</code>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Zatím bez vlastní adresy, vizitka běží jen na záložní adrese.
              </p>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newHost}
                  onChange={(e) => setNewHost(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newHost.trim()) addHost(newHost);
                    }
                  }}
                  placeholder="jmeno-prijmeni.cz"
                  list="client-domains"
                />
                <datalist id="client-domains">
                  {suggestions.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <Button type="button" variant="outline" onClick={() => addHost(newHost)} disabled={!newHost.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat
                </Button>
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">Domény klienta:</span>
                  {suggestions.map((d) => (
                    <Button key={d} type="button" variant="outline" size="xs" onClick={() => addHost(d)}>
                      <Plus className="h-3 w-3" />
                      {d}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Záložní adresa:</span>
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {fallbackUrl.replace("https://", "")}
                </a>
                <span className="flex-1" />
                <Button
                  size="xs"
                  variant="ghost"
                  nativeButton={false}
                  render={<a href={`${fallbackUrl}?nahled=1`} target="_blank" rel="noopener noreferrer" />}
                >
                  <Eye className="h-3 w-3" />
                  Náhled
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  nativeButton={false}
                  render={<a href={primary ? `https://${primary}` : fallbackUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLink className="h-3 w-3" />
                  Otevřít vizitku
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Neindexuje se. Když má vizitka vlastní adresu a je živá, přesměruje na ni; Náhled funguje vždy.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              Nastavení vizitky
            </CardTitle>
            <CardDescription>Vizitka si je bere z CRM, do stránek se propíše do hodiny.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="leadEmail">E-mail pro poptávky</Label>
              <Input
                id="leadEmail"
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder={clientEmail ?? "poradce@email.cz"}
              />
              <p className="text-xs text-muted-foreground">Prázdné = e-mail z profilu vizitky.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ga4">Měřicí ID Google Analytics</Label>
              <Input id="ga4" value={ga4} onChange={(e) => setGa4(e.target.value.toUpperCase())} placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification">Ověření Search Console</Label>
              <Input
                id="verification"
                value={verification}
                onChange={(e) => setVerification(e.target.value)}
                placeholder="Hodnota content z meta tagu google-site-verification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frames">Weby, které smí vizitku vložit</Label>
              <Textarea
                id="frames"
                rows={3}
                value={frames}
                onChange={(e) => setFrames(e.target.value)}
                placeholder="https://kancelar.cz"
              />
              <p className="text-xs text-muted-foreground">Každý na nový řádek, celá adresa s https://. Typicky web kanceláře.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && vercel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Mapa a domény všech vizitek se dorovnají podle CRM (po ruční změně ve Vercelu).
          </span>
          <Button type="button" variant="outline" size="sm" onClick={syncAll} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Synchronizovat všechny vizitky
          </Button>
        </div>
      )}

      <FormActions cancelHref={backHref} submitting={saving} onSubmit={onSubmit} />
    </div>
  );
}
