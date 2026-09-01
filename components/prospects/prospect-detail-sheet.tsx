"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { renderOutreachEmail } from "@/lib/email-templates/outreach";
import { renderFollowupEmail } from "@/lib/email-templates/followup";
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
import { formatDate, formatDateTime } from "@/lib/format";
import {
  ArrowRightLeft,
  Phone,
  ThumbsDown,
  UserX,
  Unlock,
  ExternalLink,
  Mail,
  Monitor,
  Archive,
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
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [acting, setActing] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"not_interested" | "unreachable">("not_interested");
  const [statusNote, setStatusNote] = useState("");
  const [prevProspectId, setPrevProspectId] = useState<string | null>(null);

  // Outreach email dialog state
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachGreeting, setOutreachGreeting] = useState("");
  const [outreachTemplate, setOutreachTemplate] = useState<{ subject: string } | null>(null);
  const [outreachSender, setOutreachSender] = useState("");
  const [outreachLoading, setOutreachLoading] = useState(false);

  // Follow-up email dialog state
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [followupGreeting, setFollowupGreeting] = useState("");
  const [followupTemplate, setFollowupTemplate] = useState<{ subject: string } | null>(null);
  const [followupSender, setFollowupSender] = useState("");
  const [followupLoading, setFollowupLoading] = useState(false);

  // Contact form state
  const [channel, setChannel] = useState("phone");
  const [result, setResult] = useState("no_answer");
  const [contactNote, setContactNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  const prospectId = prospect?.id ?? null;
  if (prospectId !== prevProspectId) {
    setPrevProspectId(prospectId);
    setActivities([]);
    setLoadingActivity(prospectId !== null);
  }

  useEffect(() => {
    if (!prospectId) return;
    let cancelled = false;
    fetch(`/api/activity?entityType=prospect&entityId=${prospectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setActivities(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingActivity(false);
      });
    return () => { cancelled = true; };
  }, [prospectId]);

  function refreshActivities() {
    if (!prospectId) return;
    fetch(`/api/activity?entityType=prospect&entityId=${prospectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setActivities(data))
      .catch(() => {});
  }

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
      refreshActivities();
      router.refresh();
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
      toast.success("Kontakt konvertován na lead");
      onClose();
      router.push("/leads");
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
      toast.success(`Kontakt označen: ${label}`);
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
      toast.success("Kontakt uvolněn");
      onUpdate();
    } catch {
      toast.error("Nepodařilo se uvolnit kontakt");
    } finally {
      setActing(false);
    }
  }

  async function openOutreachDialog() {
    if (!prospect) return;
    setOutreachLoading(true);
    setOutreachGreeting(prospect.name.split(" ")[0]);
    try {
      const res = await fetch("/api/templates/outreach-email");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.subject) {
        toast.error("Předmět oslovení není nastaven (Nastavení → Šablony)");
        return;
      }
      setOutreachTemplate(data);
      // Fetch sender info
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        const name = me.senderName || me.displayName || "";
        const email = me.senderEmail || me.email || "";
        setOutreachSender(`${name} <${email}>`);
      }
      setOutreachDialogOpen(true);
    } catch {
      toast.error("Nepodařilo se načíst šablonu");
    } finally {
      setOutreachLoading(false);
    }
  }

  async function handleSendOutreach() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          greeting: outreachGreeting.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }
      toast.success("Oslovení odesláno");
      setOutreachDialogOpen(false);
      refreshActivities();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat oslovení");
    } finally {
      setActing(false);
    }
  }

  async function openFollowupDialog() {
    if (!prospect) return;
    setFollowupLoading(true);
    setFollowupGreeting(prospect.name.split(" ")[0]);
    try {
      const res = await fetch("/api/templates/followup-email");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.subject) {
        toast.error("Předmět follow-upu není nastaven (Nastavení → Šablony)");
        return;
      }
      setFollowupTemplate(data);
      // Fetch sender info
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        const name = me.senderName || me.displayName || "";
        const email = me.senderEmail || me.email || "";
        setFollowupSender(`${name} <${email}>`);
      }
      setFollowupDialogOpen(true);
    } catch {
      toast.error("Nepodařilo se načíst šablonu");
    } finally {
      setFollowupLoading(false);
    }
  }

  async function handleSendFollowup() {
    if (!prospect) return;
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_followup_email",
          greeting: followupGreeting.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }
      toast.success("Follow-up odeslán");
      setFollowupDialogOpen(false);
      refreshActivities();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat follow-up");
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
  const isAdminOrMember = userRole === "admin" || userRole === "user";
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
                {prospect.demoUrl && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Demo vizitka</dt>
                    <dd>
                      <a
                        href={prospect.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Otevřít <Monitor className="h-3 w-3" />
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
                  <dd>{formatDateTime(prospect.lastTouchAt)}</dd>
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
                  {/* Outreach email button — demoUrl je volitelný, default je demo.solopixel.cz */}
                  {prospect.email ? (
                    <Button
                      onClick={openOutreachDialog}
                      disabled={acting || outreachLoading}
                      className="w-full"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {outreachLoading ? "Načítám šablonu..." : "Odeslat oslovení"}
                    </Button>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      <Mail className="mx-auto mb-1 h-4 w-4" />
                      Oslovení nelze odeslat — chybí e-mail
                    </div>
                  )}
                  {/* Follow-up email — druhý e-mail, navazuje na odeslané oslovení */}
                  {prospect.email && (
                    <Button
                      variant="outline"
                      onClick={openFollowupDialog}
                      disabled={acting || followupLoading}
                      className="w-full"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {followupLoading ? "Načítám šablonu..." : "Odeslat follow-up"}
                    </Button>
                  )}
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
                      Uvolnit kontakt
                    </Button>
                  )}
                </>
              )}

              {/* Archive action (admin/member only) */}
              {isAdminOrMember && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Archivovat tento kontakt?")) return;
                    setActing(true);
                    try {
                      const res = await fetch("/api/archive", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "archive", collection: "prospects", id: prospect.id }),
                      });
                      if (!res.ok) throw new Error();
                      toast.success("Kontakt archivován");
                      onUpdate();
                    } catch {
                      toast.error("Nepodařilo se archivovat");
                    } finally {
                      setActing(false);
                    }
                  }}
                  disabled={acting}
                  className="w-full text-muted-foreground"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivovat
                </Button>
              )}

              <Separator />
              <ActivityTab
                entityType="prospect"
                entityId={prospect.id}
                activities={activities}
                loading={loadingActivity}
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

      {/* Outreach email dialog */}
      <Dialog open={outreachDialogOpen} onOpenChange={setOutreachDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Odeslat oslovení</DialogTitle>
          </DialogHeader>
          {outreachTemplate && prospect && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Oslovení (5. pád)</Label>
                <Input
                  value={outreachGreeting}
                  onChange={(e) => setOutreachGreeting(e.target.value)}
                  placeholder="Např. Jane, Honzo..."
                />
                <p className="text-xs text-muted-foreground">
                  Upravte oslovení — v šabloně nahradí <code>{"{{jmeno}}"}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Odkaz na demo</Label>
                <Input value={prospect.demoUrl || ""} disabled className="text-muted-foreground" />
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Náhled předmětu</p>
                <p className="text-sm font-medium">
                  {outreachTemplate.subject
                    .replace(/\{\{jmeno\}\}/g, outreachGreeting || prospect.name.split(" ")[0])
                    .replace(/\{\{odkaz\}\}/g, prospect.demoUrl || "https://demo.solopixel.cz")}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Náhled e-mailu</p>
                <div className="rounded border overflow-hidden bg-[#F1F5F9]">
                  <iframe
                    srcDoc={renderOutreachEmail({
                      jmeno: outreachGreeting || prospect.name.split(" ")[0],
                      odkaz: prospect.demoUrl || "https://demo.solopixel.cz",
                    }).html}
                    sandbox=""
                    className="w-full border-0"
                    style={{ height: "400px" }}
                    title="Náhled e-mailu"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Příjemce: <span className="font-medium">{prospect.email}</span></p>
                {outreachSender && <p>Odesláno z: <span className="font-medium">{outreachSender}</span></p>}
              </div>

              <Button
                onClick={handleSendOutreach}
                disabled={acting || !outreachGreeting.trim()}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {acting ? "Odesílám..." : "Odeslat"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up email dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Odeslat follow-up</DialogTitle>
          </DialogHeader>
          {followupTemplate && prospect && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Druhý e-mail — navazuje na odeslané oslovení. Vhodný pro kontakty, které první e-mail otevřely, ale neklikly na demo.
              </p>

              <div className="space-y-2">
                <Label>Oslovení (5. pád)</Label>
                <Input
                  value={followupGreeting}
                  onChange={(e) => setFollowupGreeting(e.target.value)}
                  placeholder="Např. Jane, Honzo..."
                />
                <p className="text-xs text-muted-foreground">
                  Upravte oslovení — v šabloně nahradí <code>{"{{jmeno}}"}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Odkaz na demo</Label>
                <Input value={prospect.demoUrl || ""} disabled className="text-muted-foreground" />
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Náhled předmětu</p>
                <p className="text-sm font-medium">
                  {followupTemplate.subject
                    .replace(/\{\{jmeno\}\}/g, followupGreeting || prospect.name.split(" ")[0])
                    .replace(/\{\{odkaz\}\}/g, prospect.demoUrl || "https://demo.solopixel.cz")}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Náhled e-mailu</p>
                <div className="rounded border overflow-hidden bg-[#F1F5F9]">
                  <iframe
                    srcDoc={renderFollowupEmail({
                      jmeno: followupGreeting || prospect.name.split(" ")[0],
                      odkaz: prospect.demoUrl || "https://demo.solopixel.cz",
                    }).html}
                    sandbox=""
                    className="w-full border-0"
                    style={{ height: "400px" }}
                    title="Náhled follow-up e-mailu"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Příjemce: <span className="font-medium">{prospect.email}</span></p>
                {followupSender && <p>Odesláno z: <span className="font-medium">{followupSender}</span></p>}
              </div>

              <Button
                onClick={handleSendFollowup}
                disabled={acting || !followupGreeting.trim()}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {acting ? "Odesílám..." : "Odeslat follow-up"}
              </Button>
            </div>
          )}
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
