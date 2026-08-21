"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, Loader2, CalendarDays, User } from "lucide-react";
import {
  invoiceFormSchema,
  invoiceItemsTotal,
  invoiceLineTotal,
  currentPeriod,
  DISCOUNT_OPTIONS,
  type InvoiceFormData,
} from "@/lib/schemas/invoice";

interface ClientOption {
  id: string;
  name: string;
  company?: string | null;
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  billingStreet?: string | null;
  billingZip?: string | null;
  billingCity?: string | null;
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

  const clientId = watch("clientId");
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const clientItems = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const cancelHref = invoice ? `/invoices/${invoice.id}` : "/invoices";

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
      router.push(isEdit ? `/invoices/${invoice!.id}` : `/invoices/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
      setSubmitting(false);
    }
  }

  const addressLine = selectedClient
    ? [
        selectedClient.billingStreet,
        [selectedClient.billingZip, selectedClient.billingCity].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <form className="grid gap-6 lg:grid-cols-3">
      {/* Levý sloupec — odběratel + položky */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odběratel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Klient *</Label>
              <Select
                items={clientItems}
                defaultValue={invoice?.clientId ?? defaultClientId ?? undefined}
                onValueChange={(val) => {
                  if (val) setValue("clientId", String(val), { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full max-w-md">
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

            {selectedClient ? (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-medium">
                  {selectedClient.company || selectedClient.name}
                </p>
                {selectedClient.company && (
                  <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
                )}
                {(selectedClient.ico || selectedClient.dic) && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {selectedClient.ico ? `IČO ${selectedClient.ico}` : null}
                    {selectedClient.ico && selectedClient.dic ? " · " : null}
                    {selectedClient.dic ? `DIČ ${selectedClient.dic}` : null}
                  </p>
                )}
                {addressLine && (
                  <p className="text-sm text-muted-foreground">{addressLine}</p>
                )}
                {selectedClient.email && (
                  <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                Po výběru klienta se zde zobrazí jeho fakturační údaje.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Položky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, idx) => {
              const line = invoiceLineTotal({
                quantity: Number(items?.[idx]?.quantity) || 0,
                unitPrice: Number(items?.[idx]?.unitPrice) || 0,
                discountPercent: Number(items?.[idx]?.discountPercent) || 0,
              });
              const discountOptions = Array.from(
                new Set([...DISCOUNT_OPTIONS, Number(items?.[idx]?.discountPercent) || 0])
              ).sort((a, b) => a - b);
              return (
                <div key={field.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Popis položky"
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                      title="Odebrat položku"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ks</Label>
                      <Input
                        className="w-16"
                        type="number"
                        step="1"
                        {...register(`items.${idx}.quantity`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cena/ks</Label>
                      <Input
                        className="w-28"
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.unitPrice`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sleva</Label>
                      <select
                        className="h-10 w-24 rounded-lg border border-input bg-transparent px-2.5 text-[0.9375rem]"
                        {...register(`items.${idx}.discountPercent`)}
                      >
                        {discountOptions.map((d) => (
                          <option key={d} value={d}>
                            {d === 0 ? "—" : `${d} %`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ml-auto space-y-1 text-right">
                      <Label className="text-xs text-muted-foreground">Celkem</Label>
                      <p className="h-10 pt-2 font-medium tabular-nums">
                        {line.toLocaleString("cs-CZ")} Kč
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
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
          </CardContent>
        </Card>
      </div>

      {/* Pravý sloupec — souhrn (lepkavý) */}
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">Souhrn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">Celkem</p>
              <p className="text-2xl font-bold tabular-nums">
                {total.toLocaleString("cs-CZ")} Kč
              </p>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="note">Poznámka</Label>
              <Textarea id="note" rows={3} {...register("note")} />
            </div>

            <div className="flex flex-col gap-2 pt-1">
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
                    disabled={submitting}
                    onClick={handleSubmit((d) => submit(d, false))}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vystavit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={handleSubmit((d) => submit(d, true))}
                  >
                    Uložit koncept
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                render={<Link href={cancelHref} />}
                nativeButton={false}
              >
                Zrušit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
