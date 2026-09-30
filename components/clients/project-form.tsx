"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Archive, Loader2 } from "lucide-react";
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
import { FormActions } from "@/components/form-actions";
import { toastWithUndo } from "@/lib/undo-toast";
import { projectStatus } from "@/lib/status";
import {
  projectFormSchema,
  projectStatuses,
  type ProjectFormData,
  type ProjectStatus,
} from "@/lib/schemas/project";
import type { ProjectData } from "./projects-section";

const statusItems = Object.fromEntries(
  projectStatuses.map((s) => [s, projectStatus[s].label])
);

async function archiveCall(action: "archive" | "restore", id: string) {
  const res = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, collection: "projects", id }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
}

/**
 * Formulář zakázky na routách `/clients/[id]/projects/...`. Archivace se
 * provede hned a jde vrátit z toastu.
 */
export function ProjectForm({
  clientId,
  project,
  backHref,
}: {
  clientId: string;
  project?: ProjectData;
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = !!project;
  const [archiving, setArchiving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          title: project.title,
          description: project.description ?? "",
          status: project.status as ProjectStatus,
          price: project.price ?? undefined,
          dueAt: project.dueAt?.slice(0, 10) ?? "",
        }
      : { status: "inquiry", dueAt: "" },
  });

  async function onSubmit(data: ProjectFormData) {
    try {
      const res = await fetch(isEdit ? `/api/projects/${project!.id}` : "/api/projects", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? data : { ...data, clientId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Chyba při ukládání");
      toast.success(isEdit ? "Zakázka upravena" : "Zakázka přidána");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit zakázku");
    }
  }

  async function archive() {
    if (!project) return;
    setArchiving(true);
    try {
      await archiveCall("archive", project.id);
      toastWithUndo({
        message: "Zakázka archivována",
        undo: async () => {
          await archiveCall("restore", project.id);
          router.refresh();
        },
      });
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Archivace se nepodařila");
      setArchiving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="projectTitle">Název *</Label>
        <Input id="projectTitle" placeholder="např. Marketingový prospekt A5" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectDescription">Popis</Label>
        <Textarea id="projectDescription" rows={3} placeholder="Co přesně se dodává, rozsah, poznámky" {...register("description")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Stav</Label>
          <Select
            items={statusItems}
            value={watch("status")}
            onValueChange={(v) => v && setValue("status", v as ProjectStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {projectStatus[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectPrice">Cena (Kč)</Label>
          <Input
            id="projectPrice"
            type="number"
            min={0}
            step={1}
            {...register("price", { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) })}
          />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectDue">Termín dodání</Label>
        <Input id="projectDue" type="date" {...register("dueAt")} />
      </div>
      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Přidat"}
      >
        {isEdit && (
          <Button type="button" variant="ghost" onClick={archive} disabled={archiving} className="text-muted-foreground">
            {archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
            Archivovat
          </Button>
        )}
      </FormActions>
    </form>
  );
}
