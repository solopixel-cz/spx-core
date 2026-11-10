"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { billedMonths, subscriptionLabel } from "@/lib/plans";
import { discountStatus } from "@/lib/discount";
import type { SubscriptionService } from "@/lib/schemas/subscription";
import { subscriptionStatusLabels as statusLabels } from "./subscription-form";

export interface SubData {
  id: string;
  service: SubscriptionService;
  plan: string | null;
  label: string | null;
  instanceId: string | null;
  priceMonthly: number;
  billingCycle: string;
  status: string;
  startedAt: string | null;
  nextInvoiceAt: string | null;
  discountPercent?: number;
  discountNote?: string;
  discountUntil?: string | null;
  internal?: boolean;
}

/** Vizitka / web klienta pro volitelnou vazbu předplatného. */
export interface SubInstanceOption {
  id: string;
  type: string;
  domain: string;
}

/**
 * Předplatná klienta (fáze 34C) — klient může platit víc služeb najednou
 * (vizitka + správa webu…). Zrušená jsou na konci a potlačená.
 */
export function SubscriptionCard({
  clientId,
  subscriptions,
  instances = [],
}: {
  clientId: string;
  subscriptions: SubData[];
  instances?: SubInstanceOption[];
}) {
  const sorted = [...subscriptions].sort(
    (a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled")
  );

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Předplatné</h3>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/clients/${clientId}/subscriptions/new`} />}
        >
          <Plus className="mr-2 h-3 w-3" />
          {subscriptions.length > 0 ? "Přidat" : "Založit"}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Žádné předplatné</p>
      ) : (
        <div className="mt-3 divide-y">
          {sorted.map((s) => (
            <SubscriptionItem key={s.id} clientId={clientId} subscription={s} instances={instances} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionItem({
  clientId,
  subscription: s,
  instances,
}: {
  clientId: string;
  subscription: SubData;
  instances: SubInstanceOption[];
}) {
  const cancelled = s.status === "cancelled";
  const instance = s.instanceId ? instances.find((i) => i.id === s.instanceId) : null;
  const promo = cancelled || s.internal ? null : discountStatus(s);
  // Po konci akce se fakturuje plná cena, tak ji tak i ukážeme.
  const discountActive = !!s.discountPercent && promo?.kind !== "expired";
  const afterDiscount = discountActive
    ? Math.round(s.priceMonthly * (1 - s.discountPercent! / 100))
    : s.priceMonthly;
  const fullPeriodPrice = s.priceMonthly * billedMonths(s);

  return (
    <div className={cnItem(cancelled)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{subscriptionLabel(s)}</p>
          {instance && <p className="text-xs text-muted-foreground">{instance.domain}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Upravit předplatné"
          nativeButton={false}
          render={<Link href={`/clients/${clientId}/subscriptions/${s.id}/edit`} />}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      <dl className="mt-1 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Cena</dt>
          <dd>
            {discountActive ? (
              <>
                <span className="mr-1.5 text-xs text-muted-foreground line-through">
                  {s.priceMonthly.toLocaleString("cs-CZ")} Kč
                </span>
                {afterDiscount.toLocaleString("cs-CZ")} Kč/měs
              </>
            ) : (
              <>
                {s.priceMonthly.toLocaleString("cs-CZ")} Kč/měs
              </>
            )}
          </dd>
        </div>
        {s.billingCycle === "yearly" && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fakturace</dt>
            <dd>ročně ({(afterDiscount * billedMonths(s)).toLocaleString("cs-CZ")} Kč)</dd>
          </div>
        )}
        {discountActive ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Sleva</dt>
            <dd className="text-right text-green-600">
              −{s.discountPercent} %{s.discountNote ? ` (${s.discountNote})` : ""}
              {promo && promo.kind !== "permanent" && (
                <span className="block text-xs text-muted-foreground">
                  Akce do {formatDay(promo.until)}
                </span>
              )}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Stav</dt>
          <dd className="flex items-center gap-1.5">
            {s.internal && <Badge variant="secondary">Interní</Badge>}
            <Badge variant="outline">{statusLabels[s.status] ?? s.status}</Badge>
          </dd>
        </div>
        {!s.internal && !cancelled && s.nextInvoiceAt && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Příští fakturace</dt>
            <dd>{new Date(s.nextInvoiceAt).toLocaleDateString("cs-CZ")}</dd>
          </div>
        )}
      </dl>
      {promo?.kind === "ending" && (
        <p className={cnAlert("amber")}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Akce končí {formatDay(promo.until)}.{" "}
            {promo.nextInvoiceFull ? "Další faktura už bez slevy:" : "Potom plná cena:"}{" "}
            <strong>{fullPeriodPrice.toLocaleString("cs-CZ")} Kč</strong>.
          </span>
        </p>
      )}
      {promo?.kind === "expired" && (
        <p className={cnAlert("red")}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Akce skončila {formatDay(promo.until)}. Fakturuje se plná cena{" "}
            <strong>{fullPeriodPrice.toLocaleString("cs-CZ")} Kč</strong>.
          </span>
        </p>
      )}
    </div>
  );
}

function formatDay(d: Date) {
  return d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
}

function cnAlert(tone: "amber" | "red") {
  return tone === "amber"
    ? "mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
    : "mt-2 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300";
}

function cnItem(cancelled: boolean) {
  return cancelled ? "py-3 opacity-60 first:pt-0 last:pb-0" : "py-3 first:pt-0 last:pb-0";
}

