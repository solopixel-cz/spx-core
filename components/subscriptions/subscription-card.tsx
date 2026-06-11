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
import {
  Dialog,
  DialogContent,
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
        }
      : {
          plan: "standard",
          priceMonthly: PLANS.standard.defaultPrice,
          billingCycle: "monthly",
          status: "active",
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

  return (
    <div className="rounded-lg border p-4">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Upravit předplatné" : "Založit předplatné"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Tarif</Label>
                <Select
                  defaultValue={subscription?.plan ?? "standard"}
                  onValueChange={handlePlanChange}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label} ({v.defaultPrice} Kč)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceMonthly">Cena/měs. (Kč)</Label>
                  <Input id="priceMonthly" type="number" {...register("priceMonthly")} />
                  {errors.priceMonthly && <p className="text-sm text-destructive">{errors.priceMonthly.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Cyklus</Label>
                  <Select
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
              {isEdit && (
                <div className="space-y-2">
                  <Label>Stav</Label>
                  <Select
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Založit"}
              </Button>
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
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Stav</dt>
            <dd><Badge variant="outline">{statusLabels[subscription.status] ?? subscription.status}</Badge></dd>
          </div>
          {subscription.nextInvoiceAt && (
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
