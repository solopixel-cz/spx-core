"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  instanceTypeLabels as typeLabels,
  instanceStatusLabels as statusLabels,
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

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  setup: "outline",
  live: "default",
  maintenance: "secondary",
  offline: "destructive",
};

export function InstancesTab({
  clientId,
  instances,
}: {
  clientId: string;
  instances: InstanceData[];
}) {
  const base = `/clients/${clientId}/instances`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Vizitky a weby</h3>
          <p className="text-sm text-muted-foreground">Nasazené vizitky a weby klienta.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`${base}/new`} />}
        >
          <Plus className="mr-2 h-4 w-4" />
          Přidat vizitku / web
        </Button>
      </div>

      {instances.length === 0 ? (
        <EntityCardEmpty>Žádná vizitka ani web</EntityCardEmpty>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      aria-label="Upravit"
                      render={<Link href={`${base}/${inst.id}/edit`} />}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  nativeButton={false}
                  render={<Link href={`${base}/${inst.id}/edit`} />}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Upravit
                </Button>
              </div>
            </EntityCard>
          ))}
        </EntityCardList>
        </>
      )}
    </div>
  );
}
