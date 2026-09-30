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
  hosting?: string | null;
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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ");
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
  const base = `/clients/${clientId}/domains`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Domény</h3>
        {canManage && (
          <Button size="sm" nativeButton={false} render={<Link href={`${base}/new`} />}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat doménu
          </Button>
        )}
      </div>

      {domains.length === 0 ? (
        <EntityCardEmpty>Žádné domény</EntityCardEmpty>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doména</TableHead>
                <TableHead>Registrátor</TableHead>
                <TableHead>Hosting</TableHead>
                <TableHead>Účet</TableHead>
                <TableHead>Zakoupeno</TableHead>
                <TableHead>Obnovit do</TableHead>
                {canManage && <TableHead className="w-16" />}
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
                    <TableCell>{d.hosting || "—"}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          nativeButton={false}
                          aria-label="Upravit"
                          render={<Link href={`${base}/${d.id}/edit`} />}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <EntityCardList>
          {domains.map((d) => {
            const status = renewalStatus(d.renewalAt);
            return (
              <EntityCard
                key={d.id}
                title={
                  <a
                    href={domainHref(d.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                  >
                    {d.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                }
                badge={
                  d.renewalAt ? (
                    d.autoRenew ? (
                      <Badge variant="secondary">auto</Badge>
                    ) : status.level !== "ok" && status.level !== "none" ? (
                      <Badge variant={renewalBadge[status.level]}>
                        {renewalLabel(status)}
                      </Badge>
                    ) : null
                  ) : null
                }
              >
                <dl className="mt-2 space-y-1 text-sm">
                  {d.registrar && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Registrátor</dt>
                      <dd className="truncate">{d.registrar}</dd>
                    </div>
                  )}
                  {d.hosting && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Hosting</dt>
                      <dd className="truncate">{d.hosting}</dd>
                    </div>
                  )}
                  {d.account && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Účet</dt>
                      <dd className="truncate">{d.account}</dd>
                    </div>
                  )}
                  {d.renewalAt && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Obnovit do</dt>
                      <dd>{fmtDate(d.renewalAt)}</dd>
                    </div>
                  )}
                </dl>

                {canManage && (
                  <div className="relative mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      nativeButton={false}
                      render={<Link href={`${base}/${d.id}/edit`} />}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Upravit
                    </Button>
                  </div>
                )}
              </EntityCard>
            );
          })}
        </EntityCardList>
        </>
      )}
    </div>
  );
}
