"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { prospectStatus, prospectChannel, prospectResult } from "@/lib/status";
import { formatDate } from "@/lib/format";
import {
  ArrowRightLeft,
  Phone,
  ThumbsDown,
  UserX,
  Unlock,
  ExternalLink,
} from "lucide-react";
import { ActivityTab } from "@/components/clients/activity-tab";
import type { ProspectRow, UserOption } from "./prospects-page-client";

interface ActivityData {
  id: string;
  kind: string;
  text: string;
  actorUid: string;
  createdAt: string | null;
}

export function ProspectDetailSheet({
  prospect,
  users,
  currentUid,
  userRole,
  onClose,
  onUpdate,
}: {
  prospect: ProspectRow | null;
  users: UserOption[];
  currentUid: string;
  userRole: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [acting, setActing] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"not_interested" | "unreachable">("not_interested");
  const [statusNote, setStatusNote] = useState("");
  const [prevProspectId, setPrevProspectId] = useState<string | null>(null);

  // Contact form state
  const [channel, setChannel] = useState("phone");
  const [result, setResult] = useState("no_answer");
  const [contactNote, setContactNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  const prospectId = prospect?.id ?? null;
  if (prospectId !== prevProspectId) {
    setPrevProspectId(prospectId);
    setActivities([]);
  }

  useEffect(() => {
    if (!prospectId) return;
    let cancelled = false;
    fetch(`/api/activity?entityType=prospect&entityId=${prospectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setActivities(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prospectId]);

  async function handleContact() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contact",
          channel,
          result,
          note: contactNote.trim() || undefined,
          followUpAt: followUpAt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kontakt zaznamenán");
      setContactDialogOpen(false);
      resetContactForm();
      onUpdate();
    } catch {
      toast.error("Nepodařilo se zapsat kontakt");
    } finally {
      setActing(false);
    }
  }

  async function handleConvert() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Prospekt konvertován na lead");
      onClose();
      router.push("/leady");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se konvertovat");
    } finally {
      setActing(false);
    }
  }

  async function handleStatusChange() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: statusAction,
          note: statusNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const label = statusAction === "not_interested" ? "Nemá zájem" : "Nedostupný";
      toast.success(`Prospekt označen: ${label}`);
      setStatusDialogOpen(false);
      setStatusNote("");
      onUpdate();
    } catch {
      toast.error("Nepodařilo se změnit stav");
    } finally {
      setActing(false);
    }
  }

  async function handleRelease() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Prospekt uvolněn");
      onUpdate();
    } catch {
      toast.error("Nepodařilo se uvolnit prospekta");
    } finally {
      setActing(false);
    }
  }

  function resetContactForm() {
    setChannel("phone");
    setResult("no_answer");
    setContactNote("");
    setFollowUpAt("");
  }

  const owner = users.find((u) => u.id === prospect?.ownerUid);
  const isOwner = prospect?.ownerUid === currentUid;
  const isAdminOrMember = userRole === "admin" || userRole === "member";
  const canAct = isOwner || isAdminOrMember;
  const isTerminal = ["converted", "not_interested", "unreachable"].includes(prospect?.status ?? "");

  return (
    <>
      <Sheet open={!!prospect} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {prospect && (
            <div className="space-y-4 p-4">
              <SheetTitle className="text-xl">{prospect.name}</SheetTitle>

              {prospect.company && (
                <p className="text-muted-foreground">{prospect.company}</p>
              )}

              <div className="flex gap-2">
                <StatusBadge map={prospectStatus} value={prospect.status} />
                {prospect.source === "import" && (
                  <Badge variant="outline">Import</Badge>
                )}
              </div>

              <dl className="space-y-2 text-sm">
                {prospect.email && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">E-mail</dt>
                    <dd>{prospect.email}</dd>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Telefon</dt>
                    <dd>{prospect.phone}</dd>
                  </div>
                )}
                {prospect.city && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Město</dt>
                    <dd>{prospect.city}</dd>
                  </div>
                )}
                {prospect.portalUrl && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Profil</dt>
                    <dd>
                      <a
                        href={prospect.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Otevřít <ExternalLink className="h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vlastník</dt>
                  <dd>{owner?.displayName ?? "Volný"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Poslední kontakt</dt>
                  <dd>{formatDate(prospect.lastTouchAt)}</dd>
                </div>
                {prospect.nextFollowUpAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Follow-up</dt>
                    <dd
                      className={
                        new Date(prospect.nextFollowUpAt) < new Date()
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : ""
                      }
                    >
                      {formatDate(prospect.nextFollowUpAt)}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Actions */}
              {!isTerminal && canAct && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setContactDialogOpen(true)}
                      disabled={acting}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Zapsat kontakt
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleConvert}
                      disabled={acting}
                    >
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Převést na lead
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatusAction("not_interested");
                        setStatusDialogOpen(true);
                      }}
                      disabled={acting}
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Nemá zájem
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatusAction("unreachable");
                        setStatusDialogOpen(true);
                      }}
                      disabled={acting}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Nedostupný
                    </Button>
                  </div>
                  {prospect.ownerUid && (isOwner || userRole === "admin") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRelease}
                      disabled={acting}
                      className="w-full"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Uvolnit prospekta
                    </Button>
                  )}
                </>
              )}

              <Separator />
              <ActivityTab
                entityType="prospect"
                entityId={prospect.id}
                activities={activities}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Contact dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapsat kontakt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kanál</Label>
              <Select value={channel} onValueChange={(val) => val && setChannel(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(prospectChannel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Výsledek</Label>
              <Select value={result} onValueChange={(val) => val && setResult(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(prospectResult).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Poznámka</Label>
              <Textarea
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder="Volitelná poznámka..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up datum</Label>
              <Input
                type="date"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
            </div>
            <Button
              onClick={handleContact}
              disabled={acting}
              className="w-full"
            >
              {acting ? "Ukládám..." : "Uložit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status change dialog (not_interested / unreachable) */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === "not_interested" ? "Nemá zájem" : "Nedostupný"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Poznámka</Label>
              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Volitelná poznámka..."
              />
            </div>
            <Button
              onClick={handleStatusChange}
              disabled={acting}
              className="w-full"
              variant="destructive"
            >
              {acting ? "Ukládám..." : "Potvrdit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
