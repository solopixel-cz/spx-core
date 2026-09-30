"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus } from "lucide-react";
import { subscriptionLabel } from "@/lib/plans";
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
  const afterDiscount = s.discountPercent
    ? Math.round(s.priceMonthly * (1 - s.discountPercent / 100))
    : s.priceMonthly;

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
            {s.discountPercent ? (
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
            <dd>ročně ({(afterDiscount * 12).toLocaleString("cs-CZ")} Kč)</dd>
          </div>
        )}
        {s.discountPercent ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sleva</dt>
            <dd className="text-green-600">
              −{s.discountPercent} %{s.discountNote ? ` (${s.discountNote})` : ""}
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
    </div>
  );
}

function cnItem(cancelled: boolean) {
  return cancelled ? "py-3 opacity-60 first:pt-0 last:pb-0" : "py-3 first:pt-0 last:pb-0";
}

