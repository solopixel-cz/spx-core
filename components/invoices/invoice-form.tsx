"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2, Loader2, CalendarDays } from "lucide-react";
import {
  invoiceFormSchema,
  invoiceItemsTotal,
  currentPeriod,
  DISCOUNT_OPTIONS,
  type InvoiceFormData,
} from "@/lib/schemas/invoice";

interface ClientOption {
  id: string;
  name: string;
}

export interface EditInvoice {
  id: string;
  clientId: string;
  items?: { description: string; quantity: number; unitPrice: number; discountPercent?: number }[];
  dueAt: string | null; // ISO
  variableSymbol?: string | null;
  note?: string | null;
}

const blankItem = { description: "", quantity: 1, unitPrice: 0, discountPercent: 0 };

export function InvoiceForm({
  clients,
  invoice,
  defaultClientId,
  defaultItems,
}: {
  clients: ClientOption[];
  invoice?: EditInvoice;
  defaultClientId?: string;
  defaultItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!invoice;

  const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      clientId: invoice?.clientId ?? defaultClientId ?? "",
      items: invoice?.items?.length
        ? invoice.items
        : defaultItems?.length
          ? defaultItems
          : [blankItem],
      dueAt: invoice?.dueAt ? invoice.dueAt.split("T")[0] : defaultDue,
      variableSymbol: invoice?.variableSymbol ?? "",
      note: invoice?.note ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");
  const total = invoiceItemsTotal(
    (items ?? []).map((i) => ({
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      discountPercent: Number(i.discountPercent) || 0,
    }))
  );
  const clientVal = watch("clientId");
  const cancelHref = invoice ? `/fakturace/${invoice.id}` : "/fakturace";

  async function submit(data: InvoiceFormData, asDraft: boolean) {
    setSubmitting(true);
    try {
      const res = isEdit
        ? await fetch(`/api/invoices/${invoice!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update", ...data }),
          })
        : await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, asDraft }),
          });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json().catch(() => ({}));
      toast.success(isEdit ? "Faktura upravena" : `Faktura ${result.number ?? ""} uložena`);
      router.push(isEdit ? `/fakturace/${invoice!.id}` : `/fakturace/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5">
      <div className="space-y-2">
        <Label>Klient *</Label>
        <Select
          value={clientVal || undefined}
          onValueChange={(val) => {
            if (val) setValue("clientId", String(val));
          }}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Vyberte klienta" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.clientId && (
          <p className="text-sm text-destructive">{errors.clientId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Položky *</Label>
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Input
                className="min-w-40 flex-1"
                placeholder="Popis"
                {...register(`items.${idx}.description`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                title="Vložit aktuální měsíc/rok (např. 08/2026)"
                onClick={() => {
                  const cur = (getValues(`items.${idx}.description`) || "").trimEnd();
                  setValue(
                    `items.${idx}.description`,
                    (cur ? cur + " " : "") + currentPeriod(),
                    { shouldDirty: true }
                  );
                }}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Input
                className="w-16"
                type="number"
                step="1"
                placeholder="ks"
                {...register(`items.${idx}.quantity`)}
              />
              <Input
                className="w-24"
                type="number"
                step="0.01"
                placeholder="Kč/ks"
                {...register(`items.${idx}.unitPrice`)}
              />
              <select
                className="h-10 w-24 rounded-lg border border-input bg-transparent px-2.5 text-[0.9375rem]"
                title="Sleva"
                {...register(`items.${idx}.discountPercent`)}
              >
                {DISCOUNT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? "—" : `${d} %`}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {errors.items && (
          <p className="text-sm text-destructive">{errors.items.message as string}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ...blankItem })}
        >
          <Plus className="mr-1 h-4 w-4" /> Přidat položku
        </Button>
        <p className="text-xs text-muted-foreground">
          Tip: 📅 vloží aktuální měsíc/rok. Nebo napiš{" "}
          <code className="rounded bg-muted px-1">{"{obdobi}"}</code> do popisu —
          rozbalí se při vystavení (např. 08/2026).
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
        <span className="text-sm text-muted-foreground">Celkem</span>
        <span className="text-lg font-semibold">
          {total.toLocaleString("cs-CZ")} Kč
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dueAt">Splatnost *</Label>
          <Input id="dueAt" type="date" {...register("dueAt")} />
          {errors.dueAt && (
            <p className="text-sm text-destructive">{errors.dueAt.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vs">Variabilní symbol</Label>
          <Input id="vs" placeholder="Auto z čísla faktury" {...register("variableSymbol")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Poznámka</Label>
        <Textarea id="note" rows={2} {...register("note")} />
      </div>

      <div className="flex flex-wrap gap-2">
        {isEdit ? (
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit((d) => submit(d, false))}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit změny
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={handleSubmit((d) => submit(d, true))}
            >
              Uložit koncept
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit((d) => submit(d, false))}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vystavit
            </Button>
          </>
        )}
        <Button type="button" variant="ghost" render={<Link href={cancelHref} />} nativeButton={false}>
          Zrušit
        </Button>
      </div>
    </form>
  );
}
