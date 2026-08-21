"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { domainFormSchema, type DomainFormData } from "@/lib/schemas/domain";
import {
  renewalStatus,
  renewalLabel,
  domainHref,
  type RenewalLevel,
} from "@/lib/domain-renewal";

export interface DomainData {
  id: string;
  clientId: string;
  name: string;
  registrar?: string | null;
  account?: string | null;
  purchasedAt?: string | null;
  renewalAt?: string | null;
  autoRenew?: boolean;
  note?: string | null;
}

const renewalBadge: Record<RenewalLevel, "default" | "secondary" | "outline" | "destructive"> = {
  none: "outline",
  ok: "secondary",
  soon: "outline",
  urgent: "destructive",
  overdue: "destructive",
};

/** yyyy-mm-dd z ISO řetězce pro <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ");
}

function DomainFormDialog({
  clientId,
  domain,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: {
  clientId: string;
  domain?: DomainData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger: React.ReactElement;
}) {
  const isEdit = !!domain;

  const {
    register,
    handleSubmit,
    reset,
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
      reset(isEdit ? data : { autoRenew: false });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit doménu");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit doménu" : "Nová doména"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domainName">Doména *</Label>
            <Input id="domainName" placeholder="jmeno.cz" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrar">Registrátor (u koho)</Label>
              <Input id="registrar" placeholder="Wedos, Forpsi…" {...register("registrar")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Účet (pod čím vedeno)</Label>
              <Input id="account" placeholder="e-mail / login" {...register("account")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Input id="domainNote" {...register("note")} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Přidat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DomainsTab({
  clientId,
  domains,
  canManage = true,
}: {
  clientId: string;
  domains: DomainData[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(d: DomainData) {
    if (!confirm(`Opravdu odebrat doménu „${d.name}"?`)) return;
    setDeletingId(d.id);
    try {
      const res = await fetch(`/api/domains/${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Doména odebrána");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odebrat doménu");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Domény</h3>
        {canManage && (
          <DomainFormDialog
            clientId={clientId}
            open={addOpen}
            onOpenChange={setAddOpen}
            onSuccess={() => {
              setAddOpen(false);
              router.refresh();
            }}
            trigger={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Přidat doménu
              </Button>
            }
          />
        )}
      </div>

      {domains.length === 0 ? (
        <p className="text-muted-foreground">Žádné domény</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doména</TableHead>
                <TableHead>Registrátor</TableHead>
                <TableHead>Účet</TableHead>
                <TableHead>Zakoupeno</TableHead>
                <TableHead>Obnovit do</TableHead>
                {canManage && <TableHead className="w-24">Akce</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => {
                const status = renewalStatus(d.renewalAt);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <a
                        href={domainHref(d.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium hover:text-primary hover:underline"
                      >
                        {d.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell>{d.registrar || "—"}</TableCell>
                    <TableCell>{d.account || "—"}</TableCell>
                    <TableCell>{fmtDate(d.purchasedAt)}</TableCell>
                    <TableCell>
                      {d.renewalAt ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{fmtDate(d.renewalAt)}</span>
                          {d.autoRenew ? (
                            <Badge variant="secondary">auto</Badge>
                          ) : (
                            status.level !== "ok" &&
                            status.level !== "none" && (
                              <Badge variant={renewalBadge[status.level]}>
                                {renewalLabel(status)}
                              </Badge>
                            )
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center">
                          <DomainFormDialog
                            clientId={clientId}
                            domain={d}
                            open={editId === d.id}
                            onOpenChange={(open) => setEditId(open ? d.id : null)}
                            onSuccess={() => {
                              setEditId(null);
                              router.refresh();
                            }}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === d.id}
                            onClick={() => handleDelete(d)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {deletingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
