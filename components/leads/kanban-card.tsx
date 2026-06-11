"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sourceLabels, type LeadRow, type UserOption } from "./leads-page-client";

function getTimeSince(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "dnes";
  if (days === 1) return "1 den";
  if (days < 5) return `${days} dny`;
  return `${days} dní`;
}

export function KanbanCard({
  lead,
  users,
  onClick,
  isDragging,
}: {
  lead: LeadRow;
  users: UserOption[];
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const owner = users.find((u) => u.id === lead.ownerUid);
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{lead.name}</p>
          {lead.company && (
            <p className="truncate text-xs text-muted-foreground">
              {lead.company}
            </p>
          )}
        </div>
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-[10px]">
            {owner?.displayName?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {sourceLabels[lead.source] ?? lead.source}
        </Badge>
        {lead.value ? (
          <span className="text-xs font-medium">
            {lead.value.toLocaleString("cs-CZ")} Kč
          </span>
        ) : null}
      </div>

      {lead.updatedAt && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {getTimeSince(lead.updatedAt)}
        </p>
      )}
    </div>
  );
}
