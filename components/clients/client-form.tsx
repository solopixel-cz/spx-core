"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FormActions } from "@/components/form-actions";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { clientFormSchema, type ClientFormData } from "@/lib/schemas/client";

interface ClientFormProps {
  defaultValues?: Partial<ClientFormData> & { id?: string };
  /** Převod z Oslovení: ID kontaktu (server ho označí jako převedený). */
  prospectId?: string;
  /** Kam vede „Zrušit". */
  cancelHref: string;
}

/**
 * Formulář klienta (nový / úprava / převod z Oslovení). Vykresluje se na
 * routách `/clients/new` a `/clients/[id]/edit`; po uložení vede na detail.
 */
export function ClientForm({ defaultValues, prospectId, cancelHref }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  // Onboarding úkoly ze šablony — jen u nového klienta, výchozí zapnuto.
  const [createOnboarding, setCreateOnboarding] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      status: "onboarding",
      kind: "person",
      ...defaultValues,
    },
  });

  const isCompany = watch("kind") === "company";

  async function onSubmit(data: ClientFormData) {
    try {
      const url = isEdit
        ? `/api/clients/${defaultValues!.id}`
        : "/api/clients";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // Osoba nemá kontaktní osobu, firma nemá značku — neplatné pole vyprázdnit.
        body: JSON.stringify({
          ...(data.kind === "company"
            ? { ...data, company: "" }
            : { ...data, contactName: "" }),
          ...(isEdit ? {} : { createOnboarding, ...(prospectId ? { prospectId } : {}) }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }

      const result = (await res.json().catch(() => ({}))) as { id?: string; tasksGenerated?: number };
      toast.success(
        isEdit
          ? "Klient aktualizován"
          : result.tasksGenerated
            ? `Klient vytvořen, onboarding úkolů: ${result.tasksGenerated}`
            : "Klient vytvořen"
      );
      const targetId = isEdit ? defaultValues!.id : result.id;
      router.push(targetId ? `/clients/${targetId}` : "/clients");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nepodařilo se uložit klienta"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Tabs
        value={isCompany ? "company" : "person"}
        onValueChange={(v) => setValue("kind", v as ClientFormData["kind"])}
      >
        <TabsList className="w-full">
          <TabsTrigger value="person">Osoba</TabsTrigger>
          <TabsTrigger value="company">Firma</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{isCompany ? "Název firmy *" : "Jméno a příjmení *"}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
        {isCompany ? (
          <div className="space-y-2">
            <Label htmlFor="contactName">Kontaktní osoba</Label>
            <Input id="contactName" placeholder="Jméno a příjmení" {...register("contactName")} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="company">Firma / značka</Label>
            <Input id="company" placeholder="např. OVB, ZFP" {...register("company")} />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ico">IČO</Label>
          <Input id="ico" {...register("ico")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dic">DIČ</Label>
          <Input id="dic" {...register("dic")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingStreet">Ulice a č.p.</Label>
        <Input id="billingStreet" {...register("billingStreet")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billingZip">PSČ</Label>
          <Input id="billingZip" {...register("billingZip")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingCity">Město</Label>
          <Input id="billingCity" {...register("billingCity")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">{isCompany ? "E-mail kontaktu *" : "E-mail *"}</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{isCompany ? "Telefon kontaktu" : "Telefon"}</Label>
          <Input id="phone" {...register("phone")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Stav</Label>
        <Select
          items={{
            onboarding: "Onboarding",
            active: "Aktivní",
            paused: "Pozastavený",
            churned: "Odešlý",
          }}
          value={watch("status")}
          onValueChange={(val) => {
            if (val) setValue("status", val as ClientFormData["status"]);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="paused">Pozastavený</SelectItem>
            <SelectItem value="churned">Odešlý</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Poznámky</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      {!isEdit && (
        <label className="flex items-start gap-3 rounded-xl border p-3">
          <Checkbox
            checked={createOnboarding}
            onCheckedChange={setCreateOnboarding}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">Vytvořit onboarding úkoly</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Podle šablony v Nastavení → Onboarding.
            </span>
          </span>
        </label>
      )}

      <FormActions
        cancelHref={cancelHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Vytvořit klienta"}
      />
    </form>
  );
}
