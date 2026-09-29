"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { ArchiveNotice, ArchiveToggle } from "@/components/archive-toggle";
import {
  BulkArchiveBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/bulk-archive-bar";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { prospectStatus, outreachEmailStatus } from "@/lib/status";
import type { OutreachContent } from "@/lib/email-templates/outreach-content";
import { formatDate, formatDateTime } from "@/lib/format";
import { Plus, Upload, Hand, Monitor, Phone } from "lucide-react";
import Link from "next/link";
import { ProspectFormDialog } from "./prospect-form-dialog";
import { CsvImportDialog } from "./csv-import-dialog";

export interface ProspectRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  portalUrl: string | null;
  demoUrl: string | null;
  status: string;
  ownerUid: string | null;
  leadId: string | null;
  source: string;
  importBatchId: string | null;
  claimedAt: string | null;
  lastTouchAt: string | null;
  nextFollowUpAt: string | null;
  lastEmailStatus: string | null;
  wasCalled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt?: string | null;
  outreachContent?: OutreachContent | null;
}

export interface UserOption {
  id: string;
  displayName: string;
  email: string;
}

const statusLabels: Record<string, string> = {
  new: "Nový",
  contacted: "Osloven",
  responding: "Reaguje",
  not_interested: "Nemá zájem",
  unreachable: "Nedostupný",
  converted: "Konvertován",
};

export function ProspektiPageClient({
  initialProspects,
  initialHasMore = false,
  users,
  currentUid,
  userRole,
  archived = false,
}: {
  initialProspects: ProspectRow[];
  initialHasMore?: boolean;
  users: UserOption[];
  currentUid: string;
  userRole: string;
  /** Tabulka archivovaných kontaktů (`?archived=1`) — detail archivovaného kontaktu neexistuje, řádky se neotevírají. */
  archived?: boolean;
}) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Resync ze serveru po globálním Obnovit — úprava stavu během renderu
  // (router.refresh přinese nové `initialProspects`).
  const [prevInitialProspects, setPrevInitialProspects] = useState(initialProspects);
  if (prevInitialProspects !== initialProspects) {
    setPrevInitialProspects(initialProspects);
    setProspects(initialProspects);
    setHasMore(initialHasMore);
  }

  // Filter prospects client-side
  let filtered = prospects;

  // Tab filter
  if (tab === "free") {
    filtered = filtered.filter((p) => !p.ownerUid);
  } else if (tab === "mine") {
    filtered = filtered.filter((p) => p.ownerUid === currentUid);
  }

  // Status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Owner filter
  if (ownerFilter !== "all") {
    filtered = filtered.filter((p) => p.ownerUid === ownerFilter);
  }

  // Category filter
  if (categoryFilter !== "all") {
    filtered = filtered.filter((p) => p.category === categoryFilter);
  }

  // Text filter
  if (globalFilter) {
    const q = globalFilter.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }

  // Exclude terminal statuses from default views
  if (tab !== "all") {
    filtered = filtered.filter((p) => !["converted", "not_interested", "unreachable"].includes(p.status));
  }

  async function handleClaim(prospectId: string) {
    setClaiming(prospectId);
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });

      if (res.status === 409) {
        toast.error("Už zabráno kolegou");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error();

      // Optimistic update
      setProspects((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? { ...p, ownerUid: currentUid, claimedAt: new Date().toISOString() }
            : p
        )
      );
      toast.success("Kontakt zabrán");
    } catch {
      toast.error("Nepodařilo se zabrat kontakt");
    } finally {
      setClaiming(null);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastId = prospects[prospects.length - 1]?.id;
      const res = await fetch(`/api/prospects?cursor=${lastId}&tab=all`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProspects((prev) => [...prev, ...data.prospects]);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Nepodařilo se načíst další");
    } finally {
      setLoadingMore(false);
    }
  }

  const isAdminOrMember = userRole === "admin" || userRole === "member";
  const visibleIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const selection = useRowSelection(visibleIds, archived ? "prospects:archive" : "prospects");

  // Collect unique cities for filter
  const cities = [...new Set(prospects.map((p) => p.city).filter(Boolean))] as string[];

  // Collect unique categories for filter
  const categories = [...new Set(prospects.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a!.localeCompare(b!, "cs")
  ) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={archived ? "Archiv oslovení" : "Oslovení"}
        action={
          <div className="flex gap-2">
            {isAdminOrMember && <ArchiveToggle archived={archived} />}
            {isAdminOrMember && !archived && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                CSV Import
              </Button>
            )}
            {!archived && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat kontakt
              </Button>
            )}
          </div>
        }
      />

      {archived && <ArchiveNotice count={prospects.length} />}

      {/* Tabs */}
      {!archived && (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="free">Volní</TabsTrigger>
          <TabsTrigger value="mine">Moji</TabsTrigger>
          <TabsTrigger value="all">Všichni</TabsTrigger>
        </TabsList>
      </Tabs>
      )}

      {/* Filters */}
      <FilterBar>
        <Input
          placeholder="Hledat..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-40 flex-1 sm:max-w-sm"
        />
        <Select items={{ all: "Všechny stavy", ...statusLabels }} value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            all: "Všichni vlastníci",
            ...Object.fromEntries(users.map((u) => [u.id, u.displayName])),
          }}
          value={ownerFilter}
          onValueChange={(val) => val && setOwnerFilter(val)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Vlastník" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni vlastníci</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select
            items={{
              all: "Všechny kategorie",
              ...Object.fromEntries(categories.map((c) => [c, c])),
            }}
            value={categoryFilter}
            onValueChange={(val) => val && setCategoryFilter(val)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny kategorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {cities.length > 0 && (
          <Select
            items={{
              all: "Všechna města",
              ...Object.fromEntries(cities.map((c) => [c, c])),
            }}
            value={(globalFilter && cities.includes(globalFilter)) ? globalFilter : "all"}
            onValueChange={(val) => val && setGlobalFilter(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Město" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechna města</SelectItem>
              {cities.sort().map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>{archived ? "Archiv je prázdný" : "Žádné kontakty k oslovení"}</EntityCardEmpty>
        ) : (
          filtered.map((prospect) => {
            const owner = users.find((u) => u.id === prospect.ownerUid);
            const isFollowUpOverdue =
              prospect.nextFollowUpAt &&
              new Date(prospect.nextFollowUpAt) < new Date();
            const canClaim =
              !archived &&
              !prospect.ownerUid &&
              !["converted", "not_interested", "unreachable"].includes(
                prospect.status
              );

            return (
              <EntityCard
                key={prospect.id}
                onClick={archived ? undefined : () => router.push(`/prospects/${prospect.id}`)}
                leading={isAdminOrMember ? <RowCheckbox selection={selection} id={prospect.id} /> : undefined}
                title={prospect.name}
                badge={<StatusBadge map={prospectStatus} value={prospect.status} />}
                subtitle={[prospect.company, prospect.city, prospect.category]
                  .filter(Boolean)
                  .join(" · ")}
                meta={
                  <>
                    <span>{owner?.displayName ?? "Volný"}</span>
                    {prospect.lastTouchAt && (
                      <span>{formatDateTime(prospect.lastTouchAt)}</span>
                    )}
                    {prospect.nextFollowUpAt && (
                      <span
                        className={
                          isFollowUpOverdue
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        Follow-up: {formatDate(prospect.nextFollowUpAt)}
                      </span>
                    )}
                  </>
                }
              >
                {(prospect.lastEmailStatus || prospect.wasCalled || canClaim) && (
                  <div className="mt-2 flex items-center gap-2">
                    {prospect.lastEmailStatus && (
                      <StatusBadge
                        map={outreachEmailStatus}
                        value={prospect.lastEmailStatus}
                        className={
                          prospect.lastEmailStatus === "clicked"
                            ? "ring-1 ring-emerald-400"
                            : ""
                        }
                      />
                    )}
                    {prospect.wasCalled && (
                      <span title="Voláno">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </span>
                    )}
                    {canClaim && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(prospect.id);
                        }}
                        disabled={claiming === prospect.id}
                      >
                        <Hand className="mr-1 h-3 w-3" />
                        Zabrat
                      </Button>
                    )}
                  </div>
                )}
              </EntityCard>
            );
          })
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdminOrMember && (
                <TableHead className="w-12">
                  <SelectAllCheckbox selection={selection} />
                </TableHead>
              )}
              <TableHead>Jméno</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Město</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>Vlastník</TableHead>
              <TableHead>{archived ? "Archivováno" : "Poslední kontakt"}</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminOrMember ? 13 : 12} className="text-center text-muted-foreground">
                  Žádné kontakty k oslovení
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((prospect) => {
                const owner = users.find((u) => u.id === prospect.ownerUid);
                const isFollowUpOverdue =
                  prospect.nextFollowUpAt &&
                  new Date(prospect.nextFollowUpAt) < new Date();

                return (
                  <TableRow
                    key={prospect.id}
                    href={archived ? undefined : `/prospects/${prospect.id}`}
                    data-state={selection.isSelected(prospect.id) ? "selected" : undefined}
                  >
                    {isAdminOrMember && (
                      <TableCell>
                        <RowCheckbox selection={selection} id={prospect.id} />
                      </TableCell>
                    )}
                    <TableCell>
                      {archived ? (
                        <span className="font-medium">{prospect.name}</span>
                      ) : (
                        <Link
                          href={`/prospects/${prospect.id}`}
                          className="font-medium hover:underline text-left"
                        >
                          {prospect.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{prospect.company || "—"}</TableCell>
                    <TableCell>{prospect.city || "—"}</TableCell>
                    <TableCell>
                      {prospect.category ? (
                        <Badge variant="outline">{prospect.category}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge map={prospectStatus} value={prospect.status} />
                    </TableCell>
                    <TableCell>
                      {prospect.demoUrl && (
                        <a
                          href={prospect.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Demo vizitka"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Monitor className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {prospect.lastEmailStatus && (
                        <StatusBadge
                          map={outreachEmailStatus}
                          value={prospect.lastEmailStatus}
                          className={prospect.lastEmailStatus === "clicked" ? "ring-1 ring-emerald-400" : ""}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {prospect.wasCalled && (
                        <span title="Voláno">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{owner?.displayName ?? "—"}</TableCell>
                    <TableCell>{formatDateTime(archived ? prospect.deletedAt ?? null : prospect.lastTouchAt)}</TableCell>
                    <TableCell>
                      <span className={isFollowUpOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                        {formatDate(prospect.nextFollowUpAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!archived && !prospect.ownerUid && !["converted", "not_interested", "unreachable"].includes(prospect.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClaim(prospect.id)}
                          disabled={claiming === prospect.id}
                        >
                          <Hand className="mr-1 h-3 w-3" />
                          Zabrat
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isAdminOrMember && (
        <BulkArchiveBar
          collection="prospects"
          selection={selection}
          noun={["kontakt", "kontakty", "kontaktů"]}
          mode={archived ? "restore" : "archive"}
          onDone={(ids) => setProspects((prev) => prev.filter((p) => !ids.includes(p.id)))}
        />
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Načítám..." : "Načíst další"}
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <ProspectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      {/* CSV Import dialog */}
      {isAdminOrMember && (
        <CsvImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          users={users}
          onSuccess={() => {
            setImportOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
