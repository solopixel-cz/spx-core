"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { FormActions } from "@/components/form-actions";
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
import { CURRENCIES, formatOriginal, type CostPayment, type CostService } from "@/lib/costs";
import { costPaymentFormSchema, type CostPaymentFormData } from "@/lib/schemas/cost";

const currencyItems = Object.fromEntries(CURRENCIES.map((c) => [c, c === "CZK" ? "Kč" : c]));

/**
 * Skutečně zaplacená částka služby za měsíc (podle vyúčtování). Předvyplní
 * plán služby; existující zápis jde upravit nebo smazat (měsíc se pak počítá
 * zase podle plánu).
 */
export function CostPaymentForm({
  service,
  month,
  payment,
}: {
  service: CostService;
  month: string;
  payment: CostPayment | null;
}) {
  const router = useRouter();
  const backHref = `/costs?month=${month}`;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CostPaymentFormData>({
    resolver: zodResolver(costPaymentFormSchema),
    defaultValues: {
      serviceId: service.id,
      month,
      amount: String(payment?.amount ?? (service.billing === "usage" ? "" : service.amount)).replace(".", ","),
      currency: payment?.currency ?? service.currency,
      paidAt: payment?.paidAt?.slice(0, 10) ?? "",
      note: payment?.note ?? "",
    },
  });
  const currency = watch("currency");

  async function onSubmit(data: CostPaymentFormData) {
    try {
      const res = await fetch("/api/costs/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Chyba při ukládání");
      toast.success("Platba zapsána");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se zapsat platbu");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/costs/payments/${payment!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Zápis smazán");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se smazat zápis");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="paymentAmount">Zaplaceno *</Label>
        <div className="flex gap-2">
          <Input
            id="paymentAmount"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            className="sm:max-w-48"
            {...register("amount")}
          />
          <Select
            items={currencyItems}
            value={currency}
            onValueChange={(v) => v && setValue("currency", v as CostPaymentFormData["currency"])}
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
        ) : (
          <p className="text-xs text-muted-foreground">
            Plán: {formatOriginal(service.amount, service.currency)}
            {service.billing === "usage" ? " (odhad)" : ""}
            {payment && payment.currency !== "CZK"
              ? `. Uloženo ${payment.amountCzk.toLocaleString("cs-CZ")} Kč (kurz ${payment.rate.toLocaleString("cs-CZ", { maximumFractionDigits: 3 })})`
              : ""}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentPaidAt">Datum platby</Label>
        <Input id="paymentPaidAt" type="date" className="sm:max-w-48" {...register("paidAt")} />
        <p className="text-xs text-muted-foreground">Bez data se použije kurz ke konci měsíce.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentNote">Poznámka</Label>
        <Textarea id="paymentNote" rows={2} {...register("note")} />
      </div>

      <FormActions cancelHref={backHref} submitting={isSubmitting} submitLabel="Uložit">
        {payment && (
          <ConfirmButton
            variant="ghost"
            question="Smazat zápis?"
            confirmLabel="Smazat"
            onConfirm={handleDelete}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat zápis
          </ConfirmButton>
        )}
      </FormActions>
    </form>
  );
}
