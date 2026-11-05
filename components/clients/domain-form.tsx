"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { clearFormDraft, useFormDraft } from "@/lib/hooks/use-form-draft";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormActions } from "@/components/form-actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Trash2 } from "lucide-react";
import { domainFormSchema, type DomainFormData } from "@/lib/schemas/domain";
import type { DomainData } from "./domains-tab";

/** yyyy-mm-dd z ISO řetězce pro <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const NO_CLIENT = "__none__";

/**
 * Formulář domény na routách `/clients/[id]/domains/...` a ve správě domén
 * `/domains/...` (s `clients` navíc výběr klienta). U existující domény
 * i trvalé odebrání (inline potvrzení).
 */
export function DomainForm({
  clientId,
  domain,
  backHref,
  clients,
}: {
  clientId: string | null;
  domain?: DomainData;
  backHref: string;
  /** Správa domén: klienta jde vybrat nebo nechat prázdného. */
  clients?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isEdit = !!domain;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DomainFormData>({
    resolver: zodResolver(domainFormSchema),
    defaultValues: domain
      ? {
          name: domain.name,
          ...(clients ? { clientId: domain.clientId ?? "" } : {}),
          registrar: domain.registrar ?? "",
          account: domain.account ?? "",
          hosting: domain.hosting ?? "",
          purchasedAt: toDateInput(domain.purchasedAt),
          renewalAt: toDateInput(domain.renewalAt),
          autoRenew: domain.autoRenew ?? false,
          price: domain.price != null ? String(domain.price) : "",
          note: domain.note ?? "",
        }
      : { autoRenew: false, ...(clients ? { clientId: clientId ?? "" } : {}) },
  });

  // Rozepsaný formulář přežije znovunačtení stránky (Safari, uspaná záložka).
  const draftKey = `domain:${clients ? "all" : clientId}:${domain?.id ?? "new"}`;
  useFormDraft({ key: draftKey, form: { watch, reset, getValues } });

  const autoRenew = watch("autoRenew") ?? false;
  const selectedClient = watch("clientId") || NO_CLIENT;
  const clientItems = clients
    ? { [NO_CLIENT]: "Bez klienta", ...Object.fromEntries(clients.map((c) => [c.id, c.name])) }
    : {};

  async function onSubmit(data: DomainFormData) {
    try {
      const url = isEdit ? `/api/domains/${domain!.id}` : "/api/domains";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit || clients ? data : { ...data, clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }
      clearFormDraft(draftKey);
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

      {clients && (
        <div className="space-y-2">
          <Label>Klient</Label>
          <Select
            items={clientItems}
            value={selectedClient}
            onValueChange={(val) =>
              setValue("clientId", !val || val === NO_CLIENT ? "" : String(val), { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Bez klienta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLIENT}>Bez klienta</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="domainPrice">Cena obnovení za rok (Kč)</Label>
        <Input
          id="domainPrice"
          inputMode="decimal"
          placeholder="např. 289"
          className="sm:max-w-48"
          {...register("price")}
        />
        {errors.price ? (
          <p className="text-sm text-destructive">{errors.price.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Započítá se do nákladů po měsících.</p>
        )}
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
        onCancel={() => clearFormDraft(draftKey)}
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

