"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GitPullRequest, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  TICKET_STATUSES,
  ticketColumn,
  ticketPriorityLabels,
  ticketPriorityVariants,
  ticketStatusLabels,
  ticketTypeLabels,
} from "@/lib/ticket-labels";

export interface BoardTicket {
  id: string;
  clientId: string | null;
  clientName: string;
  type: string;
  title: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  /** Počet odkazů na pull requesty. */
  prCount?: number;
  fromHub?: boolean;
  unread?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// Hotovo ukazuje jen čerstvě hotové, starší jsou pod tlačítkem.
const DONE_RECENT_DAYS = 14;
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const COLUMN_ACCENT: Record<string, string> = {
  open: "bg-sky-500",
  in_progress: "bg-violet-500",
  code_review: "bg-indigo-500",
  waiting_client: "bg-amber-500",
  resolved: "bg-emerald-500",
};

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** V každém sloupci: nejvyšší priorita nahoře, uvnitř priority nejstarší první. */
function byPriorityThenAge(a: BoardTicket, b: BoardTicket): number {
  const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  if (p !== 0) return p;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

/**
 * Kanban Backlogu: Úkoly, Zpracovává se, Code review, Čekání na klienta, Hotovo. Kartu jde přetáhnout
 * do jiného sloupce (myší hned, na dotyk po podržení) nebo přesunout přes menu
 * na kartě. Změna se ukáže hned a uloží přes PATCH /api/tickets/[id].
 */
export function BacklogBoard({
  tickets,
  userNames,
}: {
  tickets: BoardTicket[];
  userNames: Record<string, string>;
}) {
  const router = useRouter();
  // Přesunuté karty do doby, než se stránka obnoví ze serveru.
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showOldDone, setShowOldDone] = useState(false);
  const [now] = useState(() => Date.now());
  const justDragged = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  const columns = useMemo(() => {
    const byColumn: Record<string, BoardTicket[]> = Object.fromEntries(TICKET_STATUSES.map((s) => [s, []]));
    for (const t of tickets) {
      byColumn[ticketColumn(moved[t.id] ?? t.status)].push(t);
    }
    for (const list of Object.values(byColumn)) list.sort(byPriorityThenAge);
    return byColumn;
  }, [tickets, moved]);

  const doneCutoff = now - DONE_RECENT_DAYS * 86400000;
  const isOldDone = (t: BoardTicket) =>
    !moved[t.id] && !!t.updatedAt && new Date(t.updatedAt).getTime() < doneCutoff;
  const oldDoneCount = columns.resolved.filter(isOldDone).length;

  async function move(id: string, status: string) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticketColumn(moved[id] ?? ticket.status) === status) return;
    setMoved((m) => ({ ...m, [id]: status }));
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setMoved((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      toast.error("Nepodařilo se přesunout ticket");
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    // Puštění myši po tažení vyvolá i klik na kartu, ten nesmí otevřít detail.
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    if (e.over) move(String(e.active.id), String(e.over.id));
  }

  const open = (id: string) => {
    if (!justDragged.current) router.push(`/backlog/${id}`);
  };

  const active = activeId ? tickets.find((t) => t.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      {/* Sloupce vedle sebe se scrollují do strany, od 1360 px všech 5 v mřížce. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 min-[1360px]:grid min-[1360px]:grid-cols-5 min-[1360px]:overflow-visible">
        {TICKET_STATUSES.map((status) => {
          const all = columns[status];
          const visible = status === "resolved" && !showOldDone ? all.filter((t) => !isOldDone(t)) : all;
          return (
            <Column key={status} status={status} count={all.length}>
              {visible.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nic tu není</p>
              )}
              {visible.map((t) => (
                <DraggableCard
                  key={t.id}
                  ticket={t}
                  status={ticketColumn(moved[t.id] ?? t.status)}
                  assigneeName={t.assigneeUid ? userNames[t.assigneeUid] : undefined}
                  onOpen={() => open(t.id)}
                  onMove={(s) => move(t.id, s)}
                />
              ))}
              {status === "resolved" && oldDoneCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowOldDone((v) => !v)}
                >
                  {showOldDone ? "Skrýt starší" : `Zobrazit starší (${oldDoneCount})`}
                </Button>
              )}
            </Column>
          );
        })}
      </div>
      <DragOverlay>
        {active && (
          <CardBody
            ticket={active}
            assigneeName={active.assigneeUid ? userNames[active.assigneeUid] : undefined}
            className="rotate-1 shadow-lg"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, count, children }: { status: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[82vw] max-w-sm shrink-0 snap-start flex-col gap-2 rounded-2xl bg-muted/50 p-2 transition-colors md:w-72 min-[1360px]:w-auto min-[1360px]:max-w-none",
        isOver && "bg-primary/10 ring-2 ring-primary/30"
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pt-1 pb-0.5">
        <span className={cn("h-2 w-2 rounded-full", COLUMN_ACCENT[status])} />
        <h2 className="text-sm font-semibold">{ticketStatusLabels[status]}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      </header>
      {children}
    </section>
  );
}

function DraggableCard({
  ticket,
  status,
  assigneeName,
  onOpen,
  onMove,
}: {
  ticket: BoardTicket;
  status: string;
  assigneeName?: string;
  onOpen: () => void;
  onMove: (status: string) => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: ticket.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className={cn("touch-manipulation outline-none", isDragging && "opacity-40")}
    >
      <CardBody
        ticket={ticket}
        assigneeName={assigneeName}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
                  aria-label="Přesunout"
                  // Menu nesmí spustit tažení ani otevřít detail.
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Přesunout do</DropdownMenuLabel>
              {TICKET_STATUSES.filter((s) => s !== status).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(s);
                  }}
                >
                  {ticketStatusLabels[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  );
}

function CardBody({
  ticket,
  assigneeName,
  menu,
  className,
}: {
  ticket: BoardTicket;
  assigneeName?: string;
  menu?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "cursor-pointer rounded-xl border bg-card p-3 shadow-xs transition-colors select-none hover:border-primary/40",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <p className="line-clamp-3 min-w-0 flex-1 text-sm font-medium leading-snug">
          {ticket.unread && <Badge className="mr-1.5 align-middle">Nové</Badge>}
          {ticket.title}
        </p>
        {menu}
      </div>
      <div className="mt-1 flex items-baseline gap-2 text-xs">
        <span className={cn("min-w-0 flex-1 truncate", ticket.clientId ? "text-foreground/80" : "text-muted-foreground italic")}>
          {ticket.clientName}
        </span>
        <span className="shrink-0 text-muted-foreground tabular-nums" title="Založeno">
          {formatDate(ticket.createdAt)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Badge variant={ticketPriorityVariants[ticket.priority] ?? "secondary"}>
          {ticketPriorityLabels[ticket.priority] ?? ticket.priority}
        </Badge>
        <span className="truncate text-xs text-muted-foreground">{ticketTypeLabels[ticket.type] ?? ticket.type}</span>
        {ticket.fromHub && (
          <Badge variant="outline" className="shrink-0">
            HUB
          </Badge>
        )}
        <span className="flex-1" />
        {!!ticket.prCount && (
          <span title="Pull requesty" className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
            <GitPullRequest className="h-3.5 w-3.5" />
            {ticket.prCount}
          </span>
        )}
        {assigneeName ? (
          <span
            title={assigneeName}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
          >
            {initials(assigneeName)}
          </span>
        ) : (
          <span
            title="Nepřiřazeno"
            className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/40"
          />
        )}
      </div>
    </article>
  );
}
