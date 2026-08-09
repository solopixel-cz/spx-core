"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import {
  MessageSquare,
  ArrowRightLeft,
  Phone,
  Mail,
  Bot,
  History,
} from "lucide-react";

export interface ActivityRow {
  id: string;
  actorUid: string;
  actor: string;
  entityType: string;
  entityId: string;
  kind: string;
  text: string;
  href: string;
  createdAt: string | null;
}

interface UserOption {
  id: string;
  displayName: string;
}

const entityTypeLabels: Record<string, string> = {
  client: "Klient",
  lead: "Lead",
  ticket: "Ticket",
  invoice: "Faktura",
  prospect: "Oslovení",
};

const kindIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  status_change: <ArrowRightLeft className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  system: <Bot className="h-4 w-4" />,
};

// Deterministic avatar color from uid
const avatarColors = [
  "bg-teal-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-emerald-600", "bg-indigo-600", "bg-orange-600",
];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AktivitaPageClient({
  initialActivities,
  users,
  userRole,
}: {
  initialActivities: ActivityRow[];
  users: UserOption[];
  userRole: string;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialActivities.length >= 50);

  // Resync ze serveru po globálním Obnovit — úprava stavu během renderu
  // (router.refresh přinese nové `initialActivities`).
  const [prevInitialActivities, setPrevInitialActivities] = useState(initialActivities);
  if (prevInitialActivities !== initialActivities) {
    setPrevInitialActivities(initialActivities);
    setActivities(initialActivities);
    setHasMore(initialActivities.length >= 50);
  }
  const [userFilter, setUserFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isSales = userRole === "sales";

  // Filter client-side
  let filtered = activities;
  if (userFilter !== "all") {
    filtered = filtered.filter((a) => a.actorUid === userFilter);
  }
  if (entityFilter !== "all") {
    filtered = filtered.filter((a) => a.entityType === entityFilter);
  }
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    filtered = filtered.filter((a) => a.createdAt && new Date(a.createdAt).getTime() >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime() + 86400000; // end of day
    filtered = filtered.filter((a) => a.createdAt && new Date(a.createdAt).getTime() < to);
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastId = activities[activities.length - 1]?.id;
      if (!lastId) return;
      const res = await fetch(`/api/activity/list?cursor=${lastId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActivities((prev) => [...prev, ...data.activities]);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Nepodařilo se načíst další");
    } finally {
      setLoadingMore(false);
    }
  }

  const entityTypes = isSales
    ? Object.entries(entityTypeLabels).filter(([k]) => k !== "invoice")
    : Object.entries(entityTypeLabels);

  return (
    <div className="space-y-6">
      <PageHeader title="Aktivita" />

      {/* Filters */}
      <FilterBar>
        <Select
          items={{
            all: "Všichni uživatelé",
            ...Object.fromEntries(users.map((u) => [u.id, u.displayName])),
          }}
          value={userFilter}
          onValueChange={(val) => val && setUserFilter(val)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Uživatel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni uživatelé</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            all: "Všechny typy",
            ...Object.fromEntries(entityTypes),
          }}
          value={entityFilter}
          onValueChange={(val) => val && setEntityFilter(val)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Typ entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {entityTypes.map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Od</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Do</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
      </FilterBar>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Žádná aktivita"
          description="Nenalezeny žádné záznamy pro zvolené filtry."
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((a) => (
            <Link key={a.id} href={a.href}>
              <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-muted/50">
                <div
                  className={`flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-medium text-white ${getAvatarColor(a.actorUid)}`}
                >
                  {getInitials(a.actor)}
                </div>
                <div className="flex-shrink-0 text-muted-foreground">
                  {kindIcons[a.kind] ?? kindIcons.system}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.text}</span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="hidden flex-shrink-0 text-[10px] sm:inline-flex"
                >
                  {entityTypeLabels[a.entityType] ?? a.entityType}
                </Badge>
                <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDateTime(a.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Načítám..." : "Načíst další"}
          </Button>
        </div>
      )}
    </div>
  );
}
