"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormActions } from "@/components/form-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLANS, SERVICE_LABELS, subscriptionLabel, type PlanKey } from "@/lib/plans";
import {
  subscriptionFormSchema,
  subscriptionServices,
  type SubscriptionFormData,
  type SubscriptionService,
} from "@/lib/schemas/subscription";
import type { SubData, SubInstanceOption } from "./subscription-card";

export const subscriptionStatusLabels: Record<string, string> = {
  trial: "Zkušební",
  active: "Aktivní",
  past_due: "Po splatnosti",
  cancelled: "Zrušeno",
};
const statusLabels = subscriptionStatusLabels;

const NO_INSTANCE = "__none__";

/** yyyy-mm-dd z ISO řetězce pro <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function unit(cycle: string) {
  return cycle === "yearly" ? "rok" : "měs";
}

/** Formulář předplatného na routách `/clients/[id]/subscriptions/...`. */
export function SubscriptionForm({
  clientId,
  subscription,
  instances,
  backHref,
}: {
  clientId: string;
  subscription?: SubData;
  instances: SubInstanceOption[];
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = !!subscription;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      router.push(backHref);
      router.refresh();
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
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

      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Založit"}
      />
    </form>
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
