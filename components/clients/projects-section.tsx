"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Archive, FileText, Loader2, Pencil, Plus, Receipt } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/status-badge";
import { projectStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  projectFormSchema,
  projectStatuses,
  OPEN_PROJECT_STATUSES,
  type ProjectFormData,
  type ProjectStatus,
} from "@/lib/schemas/project";

export interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  price: number | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  dueAt: string | null;
  deliveredAt: string | null;
  createdAt: string | null;
}

const statusItems = Object.fromEntries(
  projectStatuses.map((s) => [s, projectStatus[s].label])
);

/** Zakázka po termínu = rozpracovaná a termín už minul. */
function isOverdue(p: ProjectData) {
  return (
    !!p.dueAt &&
    OPEN_PROJECT_STATUSES.includes(p.status as ProjectStatus) &&
    new Date(p.dueAt) < new Date(new Date().toDateString())
  );
}

/**
 * Jednorázové zakázky klienta (fáze 34B) — sekce v záložce Služby.
 * Stav jde přepnout rovnou v seznamu; „Vyfakturovat" předvyplní fakturu.
 */
export function ProjectsSection({
  clientId,
  projects,
  canManage,
  canInvoice,
}: {
  clientId: string;
  projects: ProjectData[];
  canManage: boolean;
  /** Fakturace jen pro admin/member. */
  canInvoice: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);

  async function changeStatus(p: ProjectData, status: string) {
    if (status === p.status) return;
    setChanging(p.id);
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Zakázka: ${projectStatus[status].label}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se změnit stav");
    } finally {
      setChanging(null);
    }
  }

  const open = projects.filter((p) => OPEN_PROJECT_STATUSES.includes(p.status as ProjectStatus));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Zakázky</h3>
          <p className="text-sm text-muted-foreground">
            Jednorázové služby (např. marketingový prospekt).
            {open.length > 0 && ` Rozpracováno: ${open.length}.`}
          </p>
        </div>
        {canManage && (
          <ProjectFormDialog
            clientId={clientId}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nová zakázka
              </Button>
            }
          />
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Žádné zakázky
        </div>
      ) : (
        <div className="space-y-2.5">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              clientId={clientId}
              project={p}
              canManage={canManage}
              canInvoice={canInvoice}
              changing={changing === p.id}
              onStatus={(s) => changeStatus(p, s)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectRow({
  clientId,
  project: p,
  canManage,
  canInvoice,
  changing,
  onStatus,
}: {
  clientId: string;
  project: ProjectData;
  canManage: boolean;
  canInvoice: boolean;
  changing: boolean;
  onStatus: (status: string) => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const overdue = isOverdue(p);
  const canBill = canInvoice && canManage && !p.invoiceId && p.status !== "cancelled";

  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{p.title}</span>
            <StatusBadge map={projectStatus} value={p.status} />
          </div>
          {p.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{p.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.price != null && (
              <span className="font-medium text-foreground">{formatCurrency(p.price)}</span>
            )}
            {p.dueAt && (
              <span className={cn(overdue && "font-medium text-red-600 dark:text-red-400")}>
                Termín {formatDate(p.dueAt)}
                {overdue && " (po termínu)"}
              </span>
            )}
            {p.deliveredAt && <span>Dodáno {formatDate(p.deliveredAt)}</span>}
            {p.invoiceId && (
              <Link href={`/invoices/${p.invoiceId}`} className="inline-flex items-center gap-1 hover:underline">
                <FileText className="h-3 w-3" />
                Faktura {p.invoiceNumber ?? ""}
              </Link>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Select items={statusItems} value={p.status} onValueChange={(v) => v && onStatus(v)}>
              <SelectTrigger className="h-8 w-36" disabled={changing}>
                {changing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
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
            {canBill && (
              <Link
                href={`/invoices/new?clientId=${clientId}&project=${p.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Vyfakturovat
              </Link>
            )}
            <ProjectFormDialog
              clientId={clientId}
              project={p}
              open={editOpen}
              onOpenChange={setEditOpen}
              onSuccess={() => {
                setEditOpen(false);
                router.refresh();
              }}
              trigger={
                <Button size="icon-sm" variant="ghost" aria-label="Upravit zakázku">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectFormDialog({
  clientId,
  project,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: {
  clientId: string;
  project?: ProjectData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger: React.ReactElement;
}) {
  const isEdit = !!project;
  const [archiving, setArchiving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
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
      if (!isEdit) reset({ status: "inquiry", dueAt: "" });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit zakázku");
    }
  }

  async function archive() {
    if (!project) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", collection: "projects", id: project.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Zakázka archivována", {
        action: {
          label: "Vrátit zpět",
          onClick: async () => {
            await fetch("/api/archive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "restore", collection: "projects", id: project.id }),
            });
            onSuccess();
          },
        },
      });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archivace se nepodařila");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit zakázku" : "Nová zakázka"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectTitle">Název *</Label>
            <Input id="projectTitle" placeholder="např. Marketingový prospekt A5" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectDescription">Popis</Label>
            <Textarea id="projectDescription" rows={3} placeholder="Co přesně se dodává, rozsah, poznámky" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center gap-2">
            {isEdit && (
              <Button type="button" variant="ghost" onClick={archive} disabled={archiving} className="text-muted-foreground">
                {archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                Archivovat
              </Button>
            )}
            <Button type="submit" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Přidat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
