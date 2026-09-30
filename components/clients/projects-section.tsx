"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Pencil, Plus, Receipt } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  projectStatuses,
  OPEN_PROJECT_STATUSES,
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
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/clients/${clientId}/projects/new`} />}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nová zakázka
          </Button>
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
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Upravit zakázku"
              nativeButton={false}
              render={<Link href={`/clients/${clientId}/projects/${p.id}/edit`} />}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

