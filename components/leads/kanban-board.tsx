"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import {
  KANBAN_STAGES,
  stageLabels,
  type LeadRow,
  type UserOption,
} from "./leads-page-client";

export function KanbanBoard({
  leads,
  users,
  onStageChange,
  onLeadClick,
}: {
  leads: LeadRow[];
  users: UserOption[];
  onStageChange: (leadId: string, newStage: string) => void;
  onLeadClick: (lead: LeadRow) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLead = leads.find((l) => l.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    onStageChange(leadId, newStage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            id={stage}
            title={stageLabels[stage]}
            leads={leads.filter((l) => l.stage === stage)}
            users={users}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <KanbanCard lead={activeLead} users={users} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
