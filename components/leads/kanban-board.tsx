"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
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

  // Myš: drag po 5px. Dotyk: drag až po podržení (250 ms), aby swipe
  // mezi sloupci na mobilu nespouštěl přetahování karet.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
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
      {/* Mobil: swipe se snapem na sloupec; desktop: klasický scroll */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 md:snap-none">
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
