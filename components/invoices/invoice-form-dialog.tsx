"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  invoiceFormSchema,
  invoiceItemsTotal,
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
  items?: { description: string; quantity: number; unitPrice: number }[];
  dueAt: string | null; // ISO
  variableSymbol?: string | null;
  note?: string | null;
}

const blankItem = { description: "", quantity: 1, unitPrice: 0, discountPercent: 0 };

export function InvoiceFormDialog({
  clients,
  invoice,
  trigger,
  defaultClientId,
  defaultItems,
}: {
  clients: ClientOption[];
  invoice?: EditInvoice;
  trigger: React.ReactElement;
  /** Předvyplnění při vystavení z klienta/předplatného (create mód). */
  defaultClientId?: string;
  defaultItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!invoice;

  const defaultDue = useMemo(
    () => new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    []
  );

  const buildDefaults = (): InvoiceFormData => ({
    clientId: invoice?.clientId ?? defaultClientId ?? "",
    items: invoice?.items?.length
      ? invoice.items
      : defaultItems?.length
        ? defaultItems
        : [blankItem],
    dueAt: invoice?.dueAt ? invoice.dueAt.split("T")[0] : defaultDue,
    variableSymbol: invoice?.variableSymbol ?? "",
    note: invoice?.note ?? "",
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: buildDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Při otevření (hlavně edit) načíst aktuální hodnoty.
  useEffect(() => {
    if (open) reset(buildDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items = watch("items");
  const total = invoiceItemsTotal(
    (items ?? []).map((i) => ({
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      discountPercent: Number(i.discountPercent) || 0,
    }))
  );
  const clientVal = watch("clientId");

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
      toast.success(
        isEdit ? "Faktura upravena" : `Faktura ${result.number ?? ""} uložena`
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit fakturu" : "Nová faktura"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label>Klient *</Label>
            <Select
              value={clientVal || undefined}
              onValueChange={(val) => {
                if (val) setValue("clientId", String(val));
              }}
            >
              <SelectTrigger>
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
                <div key={field.id} className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Popis"
                    {...register(`items.${idx}.description`)}
                  />
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
                    className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs"
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
              <p className="text-sm text-destructive">
                {errors.items.message as string}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...blankItem })}
            >
              <Plus className="mr-1 h-4 w-4" /> Přidat položku
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Celkem</span>
            <span className="font-semibold">
              {total.toLocaleString("cs-CZ")} Kč
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueAt">Splatnost *</Label>
              <Input id="dueAt" type="date" {...register("dueAt")} />
              {errors.dueAt && (
                <p className="text-sm text-destructive">{errors.dueAt.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vs">Variabilní symbol</Label>
              <Input
                id="vs"
                placeholder="Auto z čísla faktury"
                {...register("variableSymbol")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Poznámka</Label>
            <Textarea id="note" rows={2} {...register("note")} />
          </div>

          <div className="flex gap-2">
            {isEdit ? (
              <Button
                type="button"
                className="flex-1"
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
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleSubmit((d) => submit(d, true))}
                >
                  Uložit koncept
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleSubmit((d) => submit(d, false))}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vystavit
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
