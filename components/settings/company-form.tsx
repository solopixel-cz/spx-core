"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  companySchema,
  type CompanyData,
  DEFAULT_VAT_NOTE,
} from "@/lib/schemas/company";

export function CompanyForm({ initial }: { initial: Partial<CompanyData> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      vatNote: DEFAULT_VAT_NOTE,
      ...initial,
    },
  });

  async function onSubmit(data: CompanyData) {
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }
      toast.success("Fakturační údaje uloženy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení se nezdařilo");
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Název dodavatele *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresa *</Label>
            <Textarea id="address" rows={3} {...register("address")} />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ico">IČO</Label>
              <Input id="ico" {...register("ico")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dic">DIČ</Label>
              <Input id="dic" {...register("dic")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Číslo účtu *</Label>
              <Input
                id="bankAccount"
                placeholder="123456789/0300"
                {...register("bankAccount")}
              />
              {errors.bankAccount && (
                <p className="text-sm text-destructive">
                  {errors.bankAccount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="CZ… (pro QR platbu)"
                {...register("iban")}
              />
              <p className="text-xs text-muted-foreground">
                Pro QR platbu. Když necháš prázdné, dopočítá se z čísla účtu.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="web">Web</Label>
            <Input id="web" placeholder="solopixel.cz" {...register("web")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatNote">Poznámka k DPH</Label>
            <Input id="vatNote" {...register("vatNote")} />
            <p className="text-xs text-muted-foreground">
              Zobrazí se na dokladu (neplátce DPH).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceFooter">Patička faktury</Label>
            <Textarea id="invoiceFooter" rows={2} {...register("invoiceFooter")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ukládám…" : "Uložit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
