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
  EntityCard,
  EntityCardList,
  EntityCardEmpty,
} from "@/components/entity-card";
import {
  instanceFormSchema,
  hostingProviders,
  type InstanceFormData,
} from "@/lib/schemas/instance";

interface InstanceData {
  id: string;
  clientId: string;
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

const typeLabels: Record<string, string> = {
  card: "Vizitka",
  web: "Web",
};

const hostingItems: Record<string, string> = Object.fromEntries(
  hostingProviders.map((h) => [h, h])
);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upravit instanci" : "Nová instance"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                items={typeLabels}
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
              items={statusLabels}
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
  const [mobileEditId, setMobileEditId] = useState<string | null>(null);

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
        <EntityCardEmpty>Žádné instance</EntityCardEmpty>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doména</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Slug / Hosting</TableHead>
                <TableHead>Stav</TableHead>
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
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabels[inst.type] ?? "Vizitka"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inst.type === "web"
                      ? inst.hosting || "—"
                      : inst.advisorSlug || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[inst.status] ?? "secondary"}
                    >
                      {statusLabels[inst.status] ?? inst.status}
                    </Badge>
                  </TableCell>
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

        <EntityCardList>
          {instances.map((inst) => (
            <EntityCard
              key={inst.id}
              title={
                <span className="inline-flex items-center gap-2">
                  {inst.domain}
                  {inst.deployUrl && (
                    <a
                      href={inst.deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              }
              badge={
                <Badge variant={statusVariants[inst.status] ?? "secondary"}>
                  {statusLabels[inst.status] ?? inst.status}
                </Badge>
              }
            >
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Typ</dt>
                  <dd>{typeLabels[inst.type] ?? "Vizitka"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {inst.type === "web" ? "Hosting" : "Slug"}
                  </dt>
                  <dd className="truncate">
                    {inst.type === "web"
                      ? inst.hosting || "—"
                      : inst.advisorSlug || "—"}
                  </dd>
                </div>
                {inst.features.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Features</dt>
                    <dd className="truncate text-right">
                      {inst.features.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="relative mt-3">
                <InstanceFormDialog
                  clientId={clientId}
                  instance={inst}
                  open={mobileEditId === inst.id}
                  onOpenChange={(open) =>
                    setMobileEditId(open ? inst.id : null)
                  }
                  onSuccess={() => {
                    setMobileEditId(null);
                    router.refresh();
                  }}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="mr-2 h-4 w-4" />
                      Upravit
                    </Button>
                  }
                />
              </div>
            </EntityCard>
          ))}
        </EntityCardList>
        </>
      )}
    </div>
  );
}
