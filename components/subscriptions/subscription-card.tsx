"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus } from "lucide-react";
import { PLANS, SERVICE_LABELS, subscriptionLabel, type PlanKey } from "@/lib/plans";
import {
  subscriptionFormSchema,
  subscriptionServices,
  type SubscriptionFormData,
  type SubscriptionService,
} from "@/lib/schemas/subscription";

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

const statusLabels: Record<string, string> = {
  trial: "Zkušební",
  active: "Aktivní",
  past_due: "Po splatnosti",
  cancelled: "Zrušeno",
};

const NO_INSTANCE = "__none__";

/** yyyy-mm-dd z ISO řetězce pro <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function unit(cycle: string) {
  return cycle === "yearly" ? "rok" : "měs";
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
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const sorted = [...subscriptions].sort(
    (a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled")
  );

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Předplatné</h3>
        <SubscriptionFormDialog
          clientId={clientId}
          instances={instances}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={() => {
            setAddOpen(false);
            router.refresh();
          }}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-3 w-3" />
              {subscriptions.length > 0 ? "Přidat" : "Založit"}
            </Button>
          }
        />
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
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
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
        <SubscriptionFormDialog
          clientId={clientId}
          subscription={s}
          instances={instances}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Upravit předplatné">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          }
        />
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

function SubscriptionFormDialog({
  clientId,
  subscription,
  instances,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: {
  clientId: string;
  subscription?: SubData;
  instances: SubInstanceOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger: React.ReactElement;
}) {
  const isEdit = !!subscription;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(subscriptionFormSchema) as any,
    defaultValues: subscription
      ? {
          service: subscription.service,
          plan: (subscription.plan as PlanKey | null) ?? undefined,
          label: subscription.label ?? "",
          instanceId: subscription.instanceId ?? "",
          priceMonthly: subscription.priceMonthly,
          billingCycle: subscription.billingCycle as "monthly" | "yearly",
          status: subscription.status as SubscriptionFormData["status"],
          discountPercent: subscription.discountPercent ?? 0,
          discountNote: subscription.discountNote ?? "",
          internal: subscription.internal ?? false,
          startedAt: toDateInput(subscription.startedAt),
          nextInvoiceAt: toDateInput(subscription.nextInvoiceAt),
        }
      : NEW_DEFAULTS,
  });

  const service = watch("service");
  const isCard = service === "card";
  // Vazba jen na instanci odpovídajícího druhu (vizitka ↔ card, web ↔ web).
  const linkable = instances.filter((i) => (isCard ? i.type === "card" : service === "web" && i.type === "web"));

  async function onSubmit(data: SubscriptionFormData) {
    try {
      const url = isEdit ? `/api/subscriptions/${subscription!.id}` : "/api/subscriptions";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? data : { ...data, clientId }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? "Předplatné aktualizováno" : "Předplatné založeno");
      if (!isEdit) reset(NEW_DEFAULTS);
      onSuccess();
    } catch {
      toast.error("Nepodařilo se uložit předplatné");
    }
  }

  function handleServiceChange(val: string | null) {
    if (!val) return;
    const next = val as SubscriptionService;
    setValue("service", next);
    setValue("instanceId", "");
    if (next === "card") {
      const plan = (watch("plan") ?? "basic") as PlanKey;
      setValue("plan", plan);
      if (!isEdit) setValue("priceMonthly", PLANS[plan].defaultPrice);
    } else {
      setValue("plan", undefined);
    }
  }

  function handlePlanChange(val: string | null) {
    if (!val) return;
    const plan = val as PlanKey;
    setValue("plan", plan);
    setValue("priceMonthly", PLANS[plan].defaultPrice);
  }

  // Živý náhled ceny ve formuláři — kolik klient reálně zaplatí.
  const wPrice = Number(watch("priceMonthly")) || 0;
  const wCycle = watch("billingCycle");
  const wDiscount = Number(watch("discountPercent")) || 0;
  // priceMonthly je vždy měsíční cena; roční fakturace = 12× (stejně jako cron a faktura).
  const wFactor = wCycle === "yearly" ? 12 : 1;
  const wAfterDiscount = Math.round(wPrice * wFactor * (1 - wDiscount / 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit předplatné" : "Založit předplatné"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Služba</Label>
              <Select items={SERVICE_LABELS} value={service} onValueChange={handleServiceChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subscriptionServices.map((s) => (
                    <SelectItem key={s} value={s}>{SERVICE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCard ? (
              <div className="space-y-2">
                <Label>Tarif</Label>
                <Select
                  items={Object.fromEntries(Object.entries(PLANS).map(([k, v]) => [k, v.label]))}
                  value={watch("plan") ?? ""}
                  onValueChange={handlePlanChange}
                >
                  <SelectTrigger><SelectValue placeholder="Vyberte tarif" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.plan && <p className="text-sm text-destructive">{errors.plan.message}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="subLabel">Název *</Label>
                <Input
                  id="subLabel"
                  placeholder={service === "web" ? "např. Správa webu" : "např. Hosting"}
                  {...register("label")}
                />
                {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
              </div>
            )}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Na faktuře: „{subscriptionLabel({ service, plan: watch("plan"), label: watch("label") })}“
          </p>

          {linkable.length > 0 && (
            <div className="space-y-2">
              <Label>{isCard ? "Vizitka" : "Web"}</Label>
              <Select
                items={{ [NO_INSTANCE]: "Nepropojovat", ...Object.fromEntries(linkable.map((i) => [i.id, i.domain])) }}
                value={watch("instanceId") || NO_INSTANCE}
                onValueChange={(v) => setValue("instanceId", !v || v === NO_INSTANCE ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INSTANCE}>Nepropojovat</SelectItem>
                  {linkable.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceMonthly">Cena za měsíc (Kč)</Label>
              <Input id="priceMonthly" type="number" {...register("priceMonthly")} />
              {wCycle === "yearly" && (
                <p className="text-xs text-muted-foreground">Fakturuje se ročně: 12 × měsíční cena</p>
              )}
              {errors.priceMonthly && <p className="text-sm text-destructive">{errors.priceMonthly.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cyklus</Label>
              <Select
                items={{ monthly: "Měsíční", yearly: "Roční" }}
                value={wCycle}
                onValueChange={(val) => { if (val) setValue("billingCycle", val as "monthly" | "yearly"); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Měsíční</SelectItem>
                  <SelectItem value="yearly">Roční</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Sleva (%)</Label>
              <Input id="discountPercent" type="number" min="0" max="100" {...register("discountPercent")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountNote">Důvod slevy</Label>
              <Input id="discountNote" placeholder="Např. první rok zdarma" {...register("discountNote")} />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border p-3">
            <Checkbox
              checked={!!watch("internal")}
              onCheckedChange={(v) => setValue("internal", v)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">Interní (obchodník / vlastní)</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Nefakturuje se, nepočítá do MRR a nezobrazuje v „Blížící se fakturace“.
              </span>
            </span>
          </label>

          {isEdit && (
            <div className="space-y-2">
              <Label>Stav</Label>
              <Select
                items={statusLabels}
                value={watch("status")}
                onValueChange={(val) => { if (val) setValue("status", val as SubscriptionFormData["status"]); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startedAt">Platí od</Label>
              <Input id="startedAt" type="date" {...register("startedAt")} />
              {!isEdit && <p className="text-xs text-muted-foreground">Prázdné = dnes</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextInvoiceAt">Příští fakturace</Label>
              <Input id="nextInvoiceAt" type="date" {...register("nextInvoiceAt")} />
              <p className="text-xs text-muted-foreground">
                {isEdit ? "Podle tohoto data se generují faktury" : "Prázdné = dopočítá se"}
              </p>
            </div>
          </div>

          {/* Živý náhled ceny */}
          <div className="rounded-xl border bg-muted/40 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Klient platí</span>
              <span className="text-lg font-semibold">
                {wAfterDiscount.toLocaleString("cs-CZ")} Kč/{unit(wCycle)}
              </span>
            </div>
            {wDiscount > 0 && (
              <p className="mt-0.5 text-right text-xs text-muted-foreground">
                <span className="line-through">{(wPrice * wFactor).toLocaleString("cs-CZ")} Kč</span>
                {" "}· sleva −{wDiscount} %
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Zrušit</Button>} />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Založit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NEW_DEFAULTS: Partial<SubscriptionFormData> = {
  service: "card",
  plan: "basic",
  label: "",
  instanceId: "",
  priceMonthly: PLANS.basic.defaultPrice,
  billingCycle: "monthly",
  status: "active",
  discountPercent: 0,
  discountNote: "",
  internal: false,
};
