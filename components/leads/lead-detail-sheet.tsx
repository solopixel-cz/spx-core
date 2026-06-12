"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Trophy, XCircle } from "lucide-react";
import { ActivityTab } from "@/components/clients/activity-tab";
import {
  stageLabels,
  sourceLabels,
  type LeadRow,
  type UserOption,
} from "./leads-page-client";

interface ActivityData {
  id: string;
  kind: string;
  text: string;
  actorUid: string;
  createdAt: string | null;
}

export function LeadDetailSheet({
  lead,
  users,
  onClose,
  onUpdate,
}: {
  lead: LeadRow | null;
  users: UserOption[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [acting, setActing] = useState(false);
  const [prevLeadId, setPrevLeadId] = useState<string | null>(null);

  const leadId = lead?.id ?? null;
  if (leadId !== prevLeadId) {
    setPrevLeadId(leadId);
    setActivities([]);
  }

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    fetch(`/api/activity?entityType=lead&entityId=${leadId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setActivities(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [leadId]);

  async function handleWon() {
    if (!lead) return;
    setActing(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "won" }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(
        `Lead vyhrán! Klient vytvořen.${
          data.tasksGenerated > 0
            ? ` ${data.tasksGenerated} onboarding úkolů vygenerováno.`
            : ""
        }`
      );
      router.push(`/klienti/${data.clientId}`);
    } catch {
      toast.error("Nepodařilo se konvertovat lead");
    } finally {
      setActing(false);
    }
  }

  async function handleLost() {
    if (!lead || !lostReason.trim()) return;
    setActing(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lost", lostReason: lostReason.trim() }),
      });

      if (!res.ok) throw new Error();
      toast.success("Lead označen jako ztracený");
      setLostDialogOpen(false);
      setLostReason("");
      onUpdate();
    } catch {
      toast.error("Nepodařilo se označit lead jako ztracený");
    } finally {
      setActing(false);
    }
  }

  const owner = users.find((u) => u.id === lead?.ownerUid);
  const isTerminal = lead?.stage === "won" || lead?.stage === "lost";

  return (
    <>
      <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {lead && (
            <div className="space-y-4 p-4">
              <SheetTitle className="text-xl">{lead.name}</SheetTitle>

              {lead.company && (
                <p className="text-muted-foreground">{lead.company}</p>
              )}

              <div className="flex gap-2">
                <Badge variant="outline">
                  {stageLabels[lead.stage] ?? lead.stage}
                </Badge>
                <Badge variant="outline">
                  {sourceLabels[lead.source] ?? lead.source}
                </Badge>
              </div>

              <dl className="space-y-2 text-sm">
                {lead.email && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">E-mail</dt>
                    <dd>{lead.email}</dd>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Telefon</dt>
                    <dd>{lead.phone}</dd>
                  </div>
                )}
                {lead.value ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Hodnota</dt>
                    <dd>{lead.value.toLocaleString("cs-CZ")} Kč/rok</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vlastník</dt>
                  <dd>{owner?.displayName ?? "—"}</dd>
                </div>
              </dl>

              {lead.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Poznámky</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </>
              )}

              {lead.lostReason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Důvod ztráty</p>
                    <p className="mt-1 text-sm">{lead.lostReason}</p>
                  </div>
                </>
              )}

              {!isTerminal && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleWon}
                      disabled={acting}
                      className="flex-1"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      Vyhráno
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setLostDialogOpen(true)}
                      disabled={acting}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Ztraceno
                    </Button>
                  </div>
                </>
              )}

              <Separator />
              <ActivityTab
                entityType="lead"
                entityId={lead.id}
                activities={activities}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Důvod ztráty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lostReason">Proč jsme lead ztratili? *</Label>
              <Input
                id="lostReason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Např. cena, konkurence, nezájem..."
              />
            </div>
            <Button
              onClick={handleLost}
              disabled={acting || !lostReason.trim()}
              className="w-full"
              variant="destructive"
            >
              {acting ? "Ukládám..." : "Označit jako ztracený"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
