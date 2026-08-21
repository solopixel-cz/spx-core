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
import { PLANS, type PlanKey } from "@/lib/plans";
import { subscriptionFormSchema, type SubscriptionFormData } from "@/lib/schemas/subscription";

interface SubData {
  id: string;
  plan: string;
  priceMonthly: number;
  billingCycle: string;
  status: string;
  startedAt: string | null;
  nextInvoiceAt: string | null;
  discountPercent?: number;
  discountNote?: string;
  internal?: boolean;
}

const statusLabels: Record<string, string> = {
  trial: "Zkušební",
  active: "Aktivní",
  past_due: "Po splatnosti",
  cancelled: "Zrušeno",
};

export function SubscriptionCard({
  clientId,
  subscription,
}: {
  clientId: string;
  subscription: SubData | null;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
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
          plan: subscription.plan as PlanKey,
          priceMonthly: subscription.priceMonthly,
          billingCycle: subscription.billingCycle as "monthly" | "yearly",
          status: subscription.status as SubscriptionFormData["status"],
          discountPercent: subscription.discountPercent ?? 0,
          discountNote: subscription.discountNote ?? "",
          internal: subscription.internal ?? false,
        }
      : {
          plan: "basic",
          priceMonthly: PLANS.basic.defaultPrice,
          billingCycle: "monthly",
          status: "active",
          discountPercent: 0,
          discountNote: "",
          internal: false,
        },
  });

  async function onSubmit(data: SubscriptionFormData) {
    try {
      const url = isEdit
        ? `/api/subscriptions/${subscription!.id}`
        : "/api/subscriptions";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? data : { ...data, clientId }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? "Předplatné aktualizováno" : "Předplatné založeno");
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se uložit předplatné");
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
  const wUnit = wCycle === "yearly" ? "rok" : "měs";
  const wAfterDiscount = Math.round(wPrice * (1 - wDiscount / 100));

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Předplatné</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                {isEdit ? <Pencil className="mr-2 h-3 w-3" /> : <Plus className="mr-2 h-3 w-3" />}
                {isEdit ? "Upravit" : "Založit"}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Upravit předplatné" : "Založit předplatné"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarif</Label>
                  <Select
                    items={Object.fromEntries(
                      Object.entries(PLANS).map(([k, v]) => [k, v.label])
                    )}
                    defaultValue={subscription?.plan ?? "basic"}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLANS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cyklus</Label>
                  <Select
                    items={{ monthly: "Měsíční", yearly: "Roční" }}
                    defaultValue={subscription?.billingCycle ?? "monthly"}
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

              <div className="space-y-2">
                <Label htmlFor="priceMonthly">
                  Cena za {wCycle === "yearly" ? "rok" : "měsíc"} (Kč)
                </Label>
                <Input id="priceMonthly" type="number" {...register("priceMonthly")} />
                {errors.priceMonthly && <p className="text-sm text-destructive">{errors.priceMonthly.message}</p>}
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
                  <span className="font-medium">Interní vizitka (obchodník / vlastní)</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Nefakturuje se a nezobrazuje v „Blížící se fakturace“.
                  </span>
                </span>
              </label>

              {isEdit && (
                <div className="space-y-2">
                  <Label>Stav</Label>
                  <Select
                    items={statusLabels}
                    defaultValue={subscription?.status ?? "active"}
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

              {!isEdit && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startedAt">Platí od</Label>
                    <Input id="startedAt" type="date" {...register("startedAt")} />
                    <p className="text-xs text-muted-foreground">Prázdné = dnes</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextInvoiceAt">Příští fakturace</Label>
                    <Input id="nextInvoiceAt" type="date" {...register("nextInvoiceAt")} />
                    <p className="text-xs text-muted-foreground">Prázdné = dopočítá se</p>
                  </div>
                </div>
              )}

              {/* Živý náhled ceny */}
              <div className="rounded-xl border bg-muted/40 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Klient platí</span>
                  <span className="text-lg font-semibold">
                    {wAfterDiscount.toLocaleString("cs-CZ")} Kč/{wUnit}
                  </span>
                </div>
                {wDiscount > 0 && (
                  <p className="mt-0.5 text-right text-xs text-muted-foreground">
                    <span className="line-through">{wPrice.toLocaleString("cs-CZ")} Kč</span>
                    {" "}· sleva −{wDiscount} %
                  </p>
                )}
              </div>

              <DialogFooter>
                <DialogClose
                  render={
                    <Button type="button" variant="outline">Zrušit</Button>
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Založit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subscription ? (
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tarif</dt>
            <dd>{PLANS[subscription.plan as PlanKey]?.label ?? subscription.plan}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Cena</dt>
            <dd>{subscription.priceMonthly.toLocaleString("cs-CZ")} Kč/{subscription.billingCycle === "monthly" ? "měs" : "rok"}</dd>
          </div>
          {subscription.discountPercent ? (
            <>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sleva</dt>
                <dd className="text-green-600">−{subscription.discountPercent} %{subscription.discountNote ? ` (${subscription.discountNote})` : ""}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt className="text-muted-foreground">Po slevě</dt>
                <dd>{Math.round(subscription.priceMonthly * (1 - subscription.discountPercent / 100)).toLocaleString("cs-CZ")} Kč/{subscription.billingCycle === "monthly" ? "měs" : "rok"}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Stav</dt>
            <dd className="flex items-center gap-1.5">
              {subscription.internal && <Badge variant="secondary">Interní</Badge>}
              <Badge variant="outline">{statusLabels[subscription.status] ?? subscription.status}</Badge>
            </dd>
          </div>
          {subscription.internal ? null : subscription.nextInvoiceAt && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Příští fakturace</dt>
              <dd>{new Date(subscription.nextInvoiceAt).toLocaleDateString("cs-CZ")}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Žádné předplatné</p>
      )}
    </div>
  );
}
