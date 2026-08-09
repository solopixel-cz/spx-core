"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { LeadRow, UserOption } from "./leads-page-client";

export function KanbanColumn({
  id,
  title,
  leads,
  users,
  onLeadClick,
}: {
  id: string;
  title: string;
  leads: LeadRow[];
  users: UserOption[];
  onLeadClick: (lead: LeadRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[400px] w-[80vw] max-w-64 shrink-0 snap-center flex-col rounded-2xl border bg-muted/30 p-2 sm:w-64 md:snap-align-none",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            users={users}
            onClick={() => onLeadClick(lead)}
          />
        ))}
      </div>
    </div>
  );
}
