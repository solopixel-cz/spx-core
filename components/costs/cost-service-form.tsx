"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { FormActions } from "@/components/form-actions";
import { useFormRouter } from "@/components/form-modal";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BILLING_LABELS,
  COST_CATEGORIES,
  CURRENCIES,
  type CostService,
} from "@/lib/costs";
import { costServiceFormSchema, type CostServiceFormData } from "@/lib/schemas/cost";

const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);
const currencyItems = Object.fromEntries(CURRENCIES.map((c) => [c, c === "CZK" ? "Kč" : c]));

/** Placená služba (Vercel, Google Cloud, OpenAI…). U existující i trvalé smazání. */
export function CostServiceForm({ service }: { service?: CostService }) {
  const router = useFormRouter();
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CostServiceFormData>({
    resolver: zodResolver(costServiceFormSchema),
    defaultValues: service
      ? {
          name: service.name,
          vendor: service.vendor ?? "",
          category: service.category,
          billing: service.billing,
          amount: String(service.amount).replace(".", ","),
          currency: service.currency,
          nextPaymentAt: toDateInput(service.nextPaymentAt),
          startedAt: toDateInput(service.startedAt),
          endedAt: toDateInput(service.endedAt),
          note: service.note ?? "",
        }
      : { category: "hosting", billing: "monthly", currency: "USD", startedAt: today() },
  });

  const category = watch("category");
  const billing = watch("billing");
  const currency = watch("currency");

  async function onSubmit(data: CostServiceFormData) {
    try {
      const res = await fetch(isEdit ? `/api/costs/services/${service!.id}` : "/api/costs/services", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Chyba při ukládání");
      toast.success(isEdit ? "Služba uložena" : "Služba přidána");
      router.push("/costs");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit službu");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/costs/services/${service!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Služba smazána");
      router.push("/costs");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se smazat službu");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="costName">Služba *</Label>
          <Input id="costName" placeholder="Vercel Pro" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="costVendor">Dodavatel</Label>
          <Input id="costVendor" placeholder="Vercel, Google, OpenAI…" {...register("vendor")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select
            items={COST_CATEGORIES}
            value={category}
            onValueChange={(v) => v && setValue("category", v as CostServiceFormData["category"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COST_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Platba</Label>
          <Select
            items={BILLING_LABELS}
            value={billing}
            onValueChange={(v) => v && setValue("billing", v as CostServiceFormData["billing"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILLING_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="costAmount">
          {billing === "usage"
            ? "Odhad za měsíc *"
            : billing === "yearly"
              ? "Částka za rok *"
              : billing === "once"
                ? "Částka *"
                : "Částka za měsíc *"}
        </Label>
        <div className="flex gap-2">
          <Input id="costAmount" inputMode="decimal" placeholder="20" className="sm:max-w-48" {...register("amount")} />
          <Select
            items={currencyItems}
            value={currency}
            onValueChange={(v) => v && setValue("currency", v as CostServiceFormData["currency"])}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {currencyItems[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.amount ? (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        ) : billing === "usage" ? (
          <p className="text-xs text-muted-foreground">
            Skutečnou částku zapíšete každý měsíc podle vyúčtování. Odhad slouží jen pro plán.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="costStartedAt">{billing === "once" ? "Datum platby *" : "Platíme od *"}</Label>
          <Input id="costStartedAt" type="date" {...register("startedAt")} />
          {errors.startedAt && <p className="text-sm text-destructive">{errors.startedAt.message}</p>}
        </div>
        {billing === "yearly" && (
          <div className="space-y-2">
            <Label htmlFor="costNextPayment">Příští platba *</Label>
            <Input id="costNextPayment" type="date" {...register("nextPaymentAt")} />
            {errors.nextPaymentAt && (
              <p className="text-sm text-destructive">{errors.nextPaymentAt.message}</p>
            )}
          </div>
        )}
        {billing !== "once" && (
          <div className="space-y-2">
            <Label htmlFor="costEndedAt">Zrušeno k</Label>
            <Input id="costEndedAt" type="date" {...register("endedAt")} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="costNote">Poznámka</Label>
        <Textarea id="costNote" rows={3} placeholder="Účet, na co se používá…" {...register("note")} />
      </div>

      <FormActions cancelHref="/costs" submitting={isSubmitting} submitLabel={isEdit ? "Uložit" : "Přidat"}>
        {isEdit && (
          <ConfirmButton
            variant="ghost"
            question="Smazat i se zapsanými platbami?"
            confirmLabel="Smazat"
            onConfirm={handleDelete}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
          </ConfirmButton>
        )}
      </FormActions>
    </form>
  );
}
