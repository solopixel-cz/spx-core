"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  DEFAULT_OUTREACH_CONTENT,
  withOutreachDefaults,
  MAX_OUTREACH_FEATURES,
  type OutreachContent,
  type OutreachFeature,
} from "@/lib/email-templates/outreach-content";
import { RichTextEditor } from "./rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { prospectStatus, prospectChannel, prospectResult, outreachEmailStatus } from "@/lib/status";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRightLeft,
  Phone,
  ThumbsDown,
  UserX,
  Unlock,
  ExternalLink,
  Mail,
  Monitor,
  Archive,
  Hand,
  Plus,
  Trash2,
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

type EmailKind = "outreach" | "followup";

const DEFAULT_CARD_URL = "https://demo.solopixel.cz";

const emailKindLabels: Record<EmailKind, string> = {
  outreach: "Oslovovací e-mail (první oslovení)",
  followup: "Follow-up (druhý e-mail)",
};

export function ProspectDetailClient({
  prospect,
  users,
  currentUid,
  userRole,
}: {
  prospect: ProspectRow;
  users: UserOption[];
  currentUid: string;
  userRole: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("info");
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [acting, setActing] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"not_interested" | "unreachable">("not_interested");
  const [statusNote, setStatusNote] = useState("");

  // Oslovení — výběr šablony, editovatelný obsah, načtené předměty + odesílatel
  const firstName = prospect.name.split(" ")[0] ?? "";
  const [emailKind, setEmailKind] = useState<EmailKind>("outreach");
  const [content, setContent] = useState<OutreachContent>(() =>
    withOutreachDefaults({
      ...prospect.outreachContent,
      greeting: prospect.outreachContent?.greeting || firstName,
    })
  );
  const [cardUrl, setCardUrl] = useState(prospect.demoUrl || "");
  const [subjects, setSubjects] = useState<Record<EmailKind, string | null>>({
    outreach: null,
    followup: null,
  });
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderLine, setSenderLine] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const greeting = content.greeting;
  function patchContent(patch: Partial<OutreachContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }
  function updateFeature(index: number, patch: Partial<OutreachFeature>) {
    setContent((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }
  function addFeature() {
    setContent((prev) =>
      prev.features.length >= MAX_OUTREACH_FEATURES
        ? prev
        : { ...prev, features: [...prev.features, { title: "", desc: "" }] }
    );
  }
  function removeFeature(index: number) {
    setContent((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  // Contact form state
  const [channel, setChannel] = useState("phone");
  const [result, setResult] = useState("no_answer");
  const [contactNote, setContactNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  const [claiming, setClaiming] = useState(false);

  const prospectId = prospect.id;

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Náhled šablon — načteme předměty obou šablon + odesílatele, ať jde
  // rovnou vidět, co se odešle.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/templates/outreach-email").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/templates/followup-email").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([outreach, followup, me]) => {
        if (cancelled) return;
        setSubjects({
          outreach: outreach?.subject ?? null,
          followup: followup?.subject ?? null,
        });
        if (me) {
          // Podpis e-mailu = jméno + telefon přihlášeného uživatele.
          const signName = me.displayName || me.senderName || "";
          const fromName = me.senderName || me.displayName || "";
          const fromEmail = me.senderEmail || me.email || "";
          setSenderName(signName);
          setSenderPhone(me.phone || "");
          setSenderLine(`${fromName} <${fromEmail}>`.trim());
          // Test e-mail předvyplníme vlastní adresou.
          if (me.email) setTestEmail(me.email);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function refreshActivities() {
    fetch(`/api/activity?entityType=prospect&entityId=${prospectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setActivities(data))
      .catch(() => {});
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      if (res.status === 409) {
        toast.error("Už zabráno kolegou");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error();
      toast.success("Kontakt zabrán");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se zabrat kontakt");
    } finally {
      setClaiming(false);
    }
  }

  async function handleContact() {
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
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kontakt konvertován na lead");
      router.push("/leads");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se konvertovat");
    } finally {
      setActing(false);
    }
  }

  async function handleStatusChange() {
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
      refreshActivities();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se změnit stav");
    } finally {
      setActing(false);
    }
  }

  async function handleRelease() {
    setActing(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kontakt uvolněn");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se uvolnit kontakt");
    } finally {
      setActing(false);
    }
  }

  // Uloží odkaz na vizitku + (u oslovení) editovaný obsah. Vyhodí chybu při neúspěchu.
  async function saveDraft() {
    const body: Record<string, unknown> = { demoUrl: cardUrl.trim() };
    if (isEditable) body.outreachContent = content;
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Uložení se nezdařilo");
    }
  }

  async function handleSaveContent() {
    setSavingContent(true);
    try {
      await saveDraft();
      toast.success("Obsah uložen");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepodařilo se uložit");
    } finally {
      setSavingContent(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      // Uložit aktuální obsah, ať test odpovídá náhledu.
      await saveDraft();
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test_email",
          toEmail: testEmail.trim(),
          greeting: greeting.trim(),
          template: emailKind,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Nepodařilo se odeslat test");
        return;
      }
      toast.success(`Testovací e-mail odeslán na ${testEmail.trim()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepodařilo se odeslat test");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendEmail() {
    setActing(true);
    try {
      // Nejdřív uložit aktuální obsah, ať se odešle přesně to, co je v náhledu.
      await saveDraft();
      const action = emailKind === "outreach" ? "send_email" : "send_followup_email";
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, greeting: greeting.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }
      toast.success(emailKind === "outreach" ? "Oslovení odesláno" : "Follow-up odeslán");
      refreshActivities();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepodařilo se odeslat");
    } finally {
      setActing(false);
    }
  }

  async function handleArchive() {
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
      router.push("/prospects");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se archivovat");
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

  const owner = users.find((u) => u.id === prospect.ownerUid);
  const isOwner = prospect.ownerUid === currentUid;
  const isAdminOrMember = userRole === "admin" || userRole === "member";
  const canAct = isOwner || isAdminOrMember;
  const isTerminal = ["converted", "not_interested", "unreachable"].includes(prospect.status);
  const canClaim =
    !prospect.ownerUid &&
    !["converted", "not_interested", "unreachable"].includes(prospect.status);

  // Živý náhled zvolené šablony s aktuálním obsahem a odkazem na vizitku
  const previewJmeno = greeting || firstName;
  const previewOdkaz = cardUrl || DEFAULT_CARD_URL;
  const previewSubject = subjects[emailKind]
    ? subjects[emailKind]!
        .replace(/\{\{jmeno\}\}/g, previewJmeno)
        .replace(/\{\{odkaz\}\}/g, previewOdkaz)
    : null;
  const previewHtml =
    emailKind === "outreach"
      ? renderOutreachEmail({
          jmeno: previewJmeno,
          odkaz: previewOdkaz,
          content,
          senderName,
          senderPhone,
        }).html
      : renderFollowupEmail({ jmeno: previewJmeno, odkaz: previewOdkaz }).html;
  const canSendEmail = !!prospect.email && !isTerminal && canAct;
  const isEditable = emailKind === "outreach";

  return (
    <div className="space-y-6">
      {/* Hlavička s návratem */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/prospects" />}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
              {prospect.name}
            </h1>
            <StatusBadge map={prospectStatus} value={prospect.status} />
            {prospect.source === "import" && <Badge variant="outline">Import</Badge>}
            {prospect.lastEmailStatus && (
              <StatusBadge
                map={outreachEmailStatus}
                value={prospect.lastEmailStatus}
                className={prospect.lastEmailStatus === "clicked" ? "ring-1 ring-emerald-400" : ""}
              />
            )}
          </div>
          {prospect.company && (
            <p className="text-sm text-muted-foreground">{prospect.company}</p>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="info">Informace</TabsTrigger>
          <TabsTrigger value="outreach">Oslovení</TabsTrigger>
        </TabsList>

        {/* ---------- TAB: INFORMACE ---------- */}
        <TabsContent value="info" className="mt-5 md:mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Levý sloupec — údaje + akce */}
            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6">
                <dl className="space-y-2 text-sm">
                  {prospect.email && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">E-mail</dt>
                      <dd className="truncate">
                        <a href={`mailto:${prospect.email}`} className="hover:underline">
                          {prospect.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Telefon</dt>
                      <dd>
                        <a href={`tel:${prospect.phone.replace(/\s/g, "")}`} className="hover:underline">
                          {prospect.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {prospect.city && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Město</dt>
                      <dd>{prospect.city}</dd>
                    </div>
                  )}
                  {prospect.portalUrl && (
                    <div className="flex justify-between gap-4">
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
                    <div className="flex justify-between gap-4">
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
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Vlastník</dt>
                    <dd>{owner?.displayName ?? "Volný"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Poslední kontakt</dt>
                    <dd>{formatDateTime(prospect.lastTouchAt)}</dd>
                  </div>
                  {prospect.nextFollowUpAt && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Follow-up</dt>
                      <dd
                        className={
                          new Date(prospect.nextFollowUpAt) < new Date()
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        {formatDate(prospect.nextFollowUpAt)}
                      </dd>
                    </div>
                  )}
                </dl>

                {canClaim && (
                  <>
                    <Separator className="my-4" />
                    <Button onClick={handleClaim} disabled={claiming} className="w-full">
                      <Hand className="mr-2 h-4 w-4" />
                      {claiming ? "Zabírám..." : "Zabrat kontakt"}
                    </Button>
                  </>
                )}
              </div>

              {!isTerminal && canAct && (
                <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Akce
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => setContactDialogOpen(true)} disabled={acting}>
                      <Phone className="mr-2 h-4 w-4" />
                      Zapsat kontakt
                    </Button>
                    <Button variant="outline" onClick={handleConvert} disabled={acting}>
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
                </div>
              )}

              {isAdminOrMember && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchive}
                  disabled={acting}
                  className="w-full text-muted-foreground"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivovat
                </Button>
              )}
            </div>

            {/* Pravý sloupec — aktivita */}
            <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6 lg:col-span-2">
              <ActivityTab
                entityType="prospect"
                entityId={prospect.id}
                activities={activities}
                loading={loadingActivity}
              />
            </div>
          </div>
        </TabsContent>

        {/* ---------- TAB: OSLOVENÍ ---------- */}
        <TabsContent value="outreach" className="mt-5 md:mt-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Nastavení odesílaného e-mailu */}
            <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs md:p-6 lg:col-span-2">
              <div className="space-y-2">
                <Label>Šablona e-mailu</Label>
                <Select
                  value={emailKind}
                  onValueChange={(val) => val && setEmailKind(val as EmailKind)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(emailKindLabels) as EmailKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {emailKindLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {emailKind === "followup" && (
                  <p className="text-xs text-muted-foreground">
                    Druhý e-mail — navazuje na odeslané oslovení. Vhodný pro kontakty, které první
                    e-mail otevřely, ale neklikly na vizitku. Tento e-mail má pevný obsah.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Oslovení (5. pád)</Label>
                <Input
                  value={content.greeting}
                  onChange={(e) => patchContent({ greeting: e.target.value })}
                  placeholder="Např. Jane, Honzo..."
                />
                <p className="text-xs text-muted-foreground">
                  V šabloně nahradí <code>{"{{jmeno}}"}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Odkaz na vizitku</Label>
                <Input
                  value={cardUrl}
                  onChange={(e) => setCardUrl(e.target.value)}
                  placeholder={DEFAULT_CARD_URL}
                  inputMode="url"
                />
                <p className="text-xs text-muted-foreground">
                  Hotová vizitka pro tento kontakt — kam vede tlačítko v e-mailu.
                  {!cardUrl && ` Zatím prázdné → použije se výchozí ${DEFAULT_CARD_URL}`}
                </p>
              </div>

              {isEditable && (
                <>
                  <Separator />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Obsah e-mailu
                  </p>

                  <div className="space-y-2">
                    <Label>Nadpis</Label>
                    <Input
                      value={content.headline}
                      onChange={(e) => patchContent({ headline: e.target.value })}
                      placeholder={DEFAULT_OUTREACH_CONTENT.headline}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Úvodní text</Label>
                    <RichTextEditor
                      value={content.introHtml}
                      onChange={(html) => patchContent({ introHtml: html })}
                      ariaLabel="Úvodní text e-mailu"
                    />
                    <p className="text-xs text-muted-foreground">
                      Píše se pod pozdrav „Dobrý den, {previewJmeno}“ — tučně / kurzíva / odkaz.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Popisek tlačítka</Label>
                    <Input
                      value={content.ctaLabel}
                      onChange={(e) => patchContent({ ctaLabel: e.target.value })}
                      placeholder={DEFAULT_OUTREACH_CONTENT.ctaLabel}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nadpis sekce s body</Label>
                      <Input
                        value={content.featuresHeading}
                        onChange={(e) => patchContent({ featuresHeading: e.target.value })}
                        placeholder={DEFAULT_OUTREACH_CONTENT.featuresHeading}
                      />
                    </div>

                    {content.features.map((f, i) => (
                      <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Bod {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFeature(i)}
                            title="Odebrat bod"
                            aria-label="Odebrat bod"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Input
                          value={f.title}
                          onChange={(e) => updateFeature(i, { title: e.target.value })}
                          placeholder="Titulek bodu"
                        />
                        <Textarea
                          value={f.desc}
                          onChange={(e) => updateFeature(i, { desc: e.target.value })}
                          placeholder="Popis bodu"
                          rows={2}
                        />
                      </div>
                    ))}

                    {content.features.length < MAX_OUTREACH_FEATURES && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFeature}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Přidat bod
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Závěrečný text</Label>
                    <RichTextEditor
                      value={content.closingHtml}
                      onChange={(html) => patchContent({ closingHtml: html })}
                      ariaLabel="Závěrečný text e-mailu"
                    />
                  </div>

                  {canAct && !isTerminal && (
                    <Button
                      variant="outline"
                      onClick={handleSaveContent}
                      disabled={savingContent || acting}
                      className="w-full"
                    >
                      {savingContent ? "Ukládám..." : "Uložit obsah"}
                    </Button>
                  )}
                </>
              )}

              <Separator />

              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  Příjemce:{" "}
                  <span className="font-medium">{prospect.email || "— chybí e-mail —"}</span>
                </p>
                {senderLine && (
                  <p>
                    Odesláno z: <span className="font-medium">{senderLine}</span>
                  </p>
                )}
                <p>
                  Podpis: <span className="font-medium">{senderName || "—"}</span>
                  {senderPhone ? ` · ${senderPhone}` : ""}
                </p>
              </div>

              {!prospect.email ? (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  <Mail className="mx-auto mb-1 h-4 w-4" />
                  E-mail nelze odeslat — u kontaktu chybí e-mailová adresa
                </div>
              ) : isTerminal ? (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Kontakt je v koncovém stavu — e-mail už nelze odeslat
                </div>
              ) : (
                <Button
                  onClick={handleSendEmail}
                  disabled={acting || savingContent || !canSendEmail || !greeting.trim() || !subjects[emailKind]}
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {acting
                    ? "Odesílám..."
                    : emailKind === "outreach"
                      ? "Odeslat oslovení"
                      : "Odeslat follow-up"}
                </Button>
              )}

              {canAct && (
                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  <Label className="text-xs">Testovací e-mail</Label>
                  <p className="text-xs text-muted-foreground">
                    Odešle aktuální náhled na zadanou adresu — bez zápisu ke kontaktu.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      inputMode="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@příklad.cz"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={
                        sendingTest ||
                        acting ||
                        savingContent ||
                        !subjects[emailKind] ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())
                      }
                    >
                      {sendingTest ? "Odesílám..." : "Odeslat test"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Živý náhled šablony, která se odešle */}
            <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6 lg:col-span-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Předmět
                </p>
                {templatesLoading ? (
                  <p className="text-sm text-muted-foreground">Načítám šablonu…</p>
                ) : previewSubject ? (
                  <p className="text-sm font-medium">{previewSubject}</p>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Předmět není nastaven (Nastavení → Šablony)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Náhled e-mailu
                </p>
                <div className="overflow-hidden rounded border bg-[#F1F5F9]">
                  <iframe
                    srcDoc={previewHtml}
                    sandbox=""
                    className="w-full border-0"
                    style={{ height: "640px" }}
                    title="Náhled e-mailu"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
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
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
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
            <Button onClick={handleContact} disabled={acting} className="w-full">
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
    </div>
  );
}
