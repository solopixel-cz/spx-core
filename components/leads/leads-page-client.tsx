"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Kanban, TableIcon } from "lucide-react";
import { LeadFormDialog } from "./lead-form-dialog";
import { KanbanBoard } from "./kanban-board";
import { LeadsTable } from "./leads-table";
import { LeadDetailSheet } from "./lead-detail-sheet";

export interface LeadRow {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source: string;
  stage: string;
  value?: number;
  ownerUid: string;
  lostReason?: string;
  notes?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserOption {
  id: string;
  displayName: string;
  email: string;
}

export const KANBAN_STAGES = [
  "new",
  "contacted",
  "demo",
  "offer",
  "contract",
  "onboarding",
] as const;

export const stageLabels: Record<string, string> = {
  new: "Nový",
  contacted: "Osloven",
  demo: "Demo",
  offer: "Nabídka",
  contract: "Smlouva",
  onboarding: "Onboarding",
  won: "Vyhráno",
  lost: "Ztraceno",
};

export const sourceLabels: Record<string, string> = {
  web: "Web",
  referral: "Doporučení",
  outreach: "Oslovení",
  event: "Akce",
  other: "Jiné",
};

export function LeadsPageClient({
  leads: initialLeads,
  users,
  currentUid,
}: {
  leads: LeadRow[];
  users: UserOption[];
  currentUid: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

  // Resync ze serveru po globálním Obnovit — úprava stavu během renderu
  // (router.refresh přinese nové `initialLeads`).
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  if (prevInitialLeads !== initialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
  }

  async function handleStageChange(leadId: string, newStage: string) {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage: newStage, updatedAt: new Date().toISOString() }
          : l
      )
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Nepodařilo se změnit fázi");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Leady</h1>
        <LeadFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
          users={users}
          currentUid={currentUid}
          trigger={
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nový lead
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <Kanban className="mr-2 h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" />
            Tabulka
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard
            leads={leads.filter(
              (l) => !["won", "lost"].includes(l.stage)
            )}
            users={users}
            onStageChange={handleStageChange}
            onLeadClick={setSelectedLead}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <LeadsTable
            leads={leads}
            users={users}
            onLeadClick={setSelectedLead}
          />
        </TabsContent>
      </Tabs>

      <LeadDetailSheet
        lead={selectedLead}
        users={users}
        onClose={() => setSelectedLead(null)}
        onUpdate={() => {
          setSelectedLead(null);
          router.refresh();
        }}
      />
    </div>
  );
}
