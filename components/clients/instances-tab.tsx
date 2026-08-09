"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Plus, Pencil } from "lucide-react";
import {
  instanceFormSchema,
  type InstanceFormData,
} from "@/lib/schemas/instance";

interface InstanceData {
  id: string;
  clientId: string;
  advisorSlug: string;
  domain: string;
  status: string;
  version: string;
  repoUrl?: string;
  deployUrl?: string;
  features: string[];
  notes?: string;
}

const statusLabels: Record<string, string> = {
  setup: "Příprava",
  live: "Živá",
  maintenance: "Údržba",
  offline: "Offline",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  setup: "outline",
  live: "default",
  maintenance: "secondary",
  offline: "destructive",
};

function InstanceFormDialog({
  clientId,
  instance,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: {
  clientId: string;
  instance?: InstanceData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger: React.ReactElement;
}) {
  const isEdit = !!instance;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InstanceFormData>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: instance
      ? {
          advisorSlug: instance.advisorSlug,
          domain: instance.domain,
          status: instance.status as InstanceFormData["status"],
          version: instance.version,
          repoUrl: instance.repoUrl ?? "",
          deployUrl: instance.deployUrl ?? "",
          features: instance.features.join(", "),
          notes: instance.notes ?? "",
        }
      : { status: "setup", version: "1.0.0" },
  });

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
      reset();
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nepodařilo se uložit instanci"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upravit instanci" : "Nová instance"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Doména *</Label>
              <Input id="domain" {...register("domain")} />
              {errors.domain && (
                <p className="text-sm text-destructive">
                  {errors.domain.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="advisorSlug">Slug *</Label>
              <Input id="advisorSlug" {...register("advisorSlug")} />
              {errors.advisorSlug && (
                <p className="text-sm text-destructive">
                  {errors.advisorSlug.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Verze *</Label>
              <Input id="version" {...register("version")} />
              {errors.version && (
                <p className="text-sm text-destructive">
                  {errors.version.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Stav</Label>
              <Select
                defaultValue={instance?.status ?? "setup"}
                onValueChange={(val) =>
                  setValue("status", val as InstanceFormData["status"])
                }
              >
                <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Features (čárkou)</Label>
            <Input
              id="features"
              placeholder="kalkulačky, AI chat"
              {...register("features")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Input id="instanceNotes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Přidat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InstancesTab({
  clientId,
  instances,
}: {
  clientId: string;
  instances: InstanceData[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Instance</h3>
        <InstanceFormDialog
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
              Přidat instanci
            </Button>
          }
        />
      </div>

      {instances.length === 0 ? (
        <p className="text-muted-foreground">Žádné instance</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doména</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Verze</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="w-24">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {inst.domain}
                      {inst.deployUrl && (
                        <a
                          href={inst.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{inst.advisorSlug}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[inst.status] ?? "secondary"}
                    >
                      {statusLabels[inst.status] ?? inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{inst.version}</TableCell>
                  <TableCell>
                    {inst.features.length > 0
                      ? inst.features.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <InstanceFormDialog
                      clientId={clientId}
                      instance={inst}
                      open={editId === inst.id}
                      onOpenChange={(open) =>
                        setEditId(open ? inst.id : null)
                      }
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
