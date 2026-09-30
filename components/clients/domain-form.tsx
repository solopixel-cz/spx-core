"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormActions } from "@/components/form-actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { domainFormSchema, type DomainFormData } from "@/lib/schemas/domain";
import type { DomainData } from "./domains-tab";

/** yyyy-mm-dd z ISO řetězce pro <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/**
 * Formulář domény na routách `/clients/[id]/domains/...`. U existující domény
 * i trvalé odebrání (inline potvrzení).
 */
export function DomainForm({
  clientId,
  domain,
  backHref,
}: {
  clientId: string;
  domain?: DomainData;
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = !!domain;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DomainFormData>({
    resolver: zodResolver(domainFormSchema),
    defaultValues: domain
      ? {
          name: domain.name,
          registrar: domain.registrar ?? "",
          account: domain.account ?? "",
          hosting: domain.hosting ?? "",
          purchasedAt: toDateInput(domain.purchasedAt),
          renewalAt: toDateInput(domain.renewalAt),
          autoRenew: domain.autoRenew ?? false,
          note: domain.note ?? "",
        }
      : { autoRenew: false },
  });

  const autoRenew = watch("autoRenew") ?? false;

  async function onSubmit(data: DomainFormData) {
    try {
      const url = isEdit ? `/api/domains/${domain!.id}` : "/api/domains";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? data : { ...data, clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }
      toast.success(isEdit ? "Doména aktualizována" : "Doména přidána");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit doménu");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/domains/${domain!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Doména odebrána");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odebrat doménu");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="domainName">Doména *</Label>
        <Input id="domainName" placeholder="jmeno.cz" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="registrar">Registrátor (kde koupeno)</Label>
          <Input id="registrar" placeholder="Wedos, Forpsi…" {...register("registrar")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hosting">Hosting (kde běží)</Label>
          <Input id="hosting" placeholder="Vercel, Wedos, Forpsi…" {...register("hosting")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">Účet (pod čím vedeno)</Label>
        <Input id="account" placeholder="e-mail / login" {...register("account")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchasedAt">Zakoupeno</Label>
          <Input id="purchasedAt" type="date" {...register("purchasedAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="renewalAt">Obnovit do</Label>
          <Input id="renewalAt" type="date" {...register("renewalAt")} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={autoRenew}
          onCheckedChange={(v) => setValue("autoRenew", v)}
        />
        <Label
          className="cursor-pointer font-normal"
          onClick={() => setValue("autoRenew", !autoRenew)}
        >
          Automatické obnovení (nepřipomínat)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="domainNote">Poznámka</Label>
        <Textarea id="domainNote" rows={3} {...register("note")} />
      </div>

      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Přidat"}
      >
        {isEdit && (
          <ConfirmButton
            variant="ghost"
            question="Trvale odebrat?"
            confirmLabel="Odebrat"
            onConfirm={handleDelete}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Odebrat
          </ConfirmButton>
        )}
      </FormActions>
    </form>
  );
}

