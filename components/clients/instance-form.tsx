"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import {
  instanceFormSchema,
  hostingProviders,
  instanceTypeLabels,
  instanceStatusLabels,
  type InstanceFormData,
} from "@/lib/schemas/instance";

export interface InstanceFormValues {
  id: string;
  type: string;
  advisorSlug: string;
  hosting?: string;
  domain: string;
  status: string;
  repoUrl?: string;
  deployUrl?: string;
  features: string[];
  notes?: string;
}

const hostingItems: Record<string, string> = Object.fromEntries(
  hostingProviders.map((h) => [h, h])
);

/** Formulář instance (vizitka / web) na routách `/clients/[id]/instances/...`. */
export function InstanceForm({
  clientId,
  instance,
  backHref,
}: {
  clientId: string;
  instance?: InstanceFormValues;
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = !!instance;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InstanceFormData>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: instance
      ? {
          type: (instance.type as InstanceFormData["type"]) ?? "card",
          advisorSlug: instance.advisorSlug,
          hosting: instance.hosting ?? "",
          domain: instance.domain,
          status: instance.status as InstanceFormData["status"],
          repoUrl: instance.repoUrl ?? "",
          deployUrl: instance.deployUrl ?? "",
          features: instance.features.join(", "),
          notes: instance.notes ?? "",
        }
      : { type: "card", status: "setup" },
  });

  const type = watch("type");
  const isWeb = type === "web";

  async function onSubmit(data: InstanceFormData) {
    try {
      const url = isEdit
        ? `/api/instances/${instance!.id}`
        : "/api/instances";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? data : { ...data, clientId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }

      toast.success(isEdit ? "Instance aktualizována" : "Instance přidána");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nepodařilo se uložit instanci"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select
            items={instanceTypeLabels}
            value={type}
            onValueChange={(val) => {
              if (val) setValue("type", val as InstanceFormData["type"]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">Vizitka</SelectItem>
              <SelectItem value="web">Web</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain">Doména *</Label>
          <Input id="domain" {...register("domain")} />
          {errors.domain && (
            <p className="text-sm text-destructive">
              {errors.domain.message}
            </p>
          )}
        </div>
      </div>

      {isWeb ? (
        <div className="space-y-2">
          <Label>Hosting</Label>
          <Select
            items={hostingItems}
            value={watch("hosting") ?? ""}
            onValueChange={(val) => setValue("hosting", val ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte hosting" />
            </SelectTrigger>
            <SelectContent>
              {hostingProviders.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="advisorSlug">Slug *</Label>
          <Input id="advisorSlug" {...register("advisorSlug")} />
          {errors.advisorSlug && (
            <p className="text-sm text-destructive">
              {errors.advisorSlug.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Stav</Label>
        <Select
          items={instanceStatusLabels}
          value={watch("status")}
          onValueChange={(val) => {
            if (val) setValue("status", val as InstanceFormData["status"]);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="setup">Příprava</SelectItem>
            <SelectItem value="live">Živá</SelectItem>
            <SelectItem value="maintenance">Údržba</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (čárkou)</Label>
        <Input
          id="features"
          placeholder="kalkulačky, AI chat"
          {...register("features")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="repoUrl">Repo URL</Label>
          <Input id="repoUrl" {...register("repoUrl")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deployUrl">Deploy URL</Label>
          <Input id="deployUrl" {...register("deployUrl")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instanceNotes">Poznámky</Label>
        <Textarea id="instanceNotes" rows={3} {...register("notes")} />
      </div>

      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Přidat"}
      />
    </form>
  );
}

