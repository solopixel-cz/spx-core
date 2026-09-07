"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Send } from "lucide-react";

interface TemplateOption {
  id: string;
  name: string;
}
interface ListOption {
  id: string;
  name: string;
  memberCount: number;
}

export function NewCampaignClient({
  templates,
  lists,
}: {
  templates: TemplateOption[];
  lists: ListOption[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [listId, setListId] = useState("");
  const [name, setName] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);

  // Náhled zvolené šablony
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    fetch(`/api/email-templates/${templateId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPreviewHtml(data.html ?? "");
        setPreviewSubject(data.subject ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const selectedList = lists.find((l) => l.id === listId);

  async function handleTest() {
    if (!templateId) {
      toast.error("Vyberte šablonu");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, testEmail: testEmail.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error);
      }
      toast.success(`Testovací e-mail odeslán na ${testEmail.trim()}`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Test se nepodařilo odeslat");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSend() {
    if (!templateId || !listId) {
      toast.error("Vyberte šablonu i seznam");
      return;
    }
    if (
      !confirm(
        `Opravdu odeslat kampaň na seznam „${selectedList?.name}" (${selectedList?.memberCount ?? 0} kontaktů)?`
      )
    )
      return;
    setSending(true);
    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, listId, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(`Kampaň odeslána: ${data.sent}/${data.total}${data.failed ? `, ${data.failed} selhalo` : ""}`);
      router.push(`/email-marketing/campaigns/${data.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Odeslání se nezdařilo");
    } finally {
      setSending(false);
    }
  }

  const canSend = !!templateId && !!listId && !sending;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Email marketing", href: "/email-marketing" },
          { label: "Nová kampaň" },
        ]}
      />

      <div className="flex items-center gap-3">
        <BackButton href="/email-marketing" className="shrink-0" />
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Nová kampaň</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nastavení */}
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
          <div className="space-y-2">
            <Label>Šablona *</Label>
            <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyberte šablonu" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Žádné šablony — vytvořte šablonu
                  </SelectItem>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Seznam kontaktů *</Label>
            <Select value={listId} onValueChange={(v) => v && setListId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyberte seznam" />
              </SelectTrigger>
              <SelectContent>
                {lists.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Žádné seznamy — vytvořte seznam
                  </SelectItem>
                ) : (
                  lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.memberCount})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedList && (
              <p className="text-xs text-muted-foreground">
                {selectedList.memberCount} kontaktů — odešle se všem s vyplněným e-mailem.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="camp-name">Název kampaně</Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Volitelné — jinak se odvodí ze šablony a seznamu"
            />
          </div>

          {previewSubject !== null && (
            <p className="text-sm">
              <span className="text-muted-foreground">Předmět: </span>
              <span className="font-medium">{previewSubject || "— bez předmětu —"}</span>
            </p>
          )}

          <Button onClick={handleSend} disabled={!canSend} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Odesílám..." : "Odeslat kampaň"}
          </Button>

          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <Label className="text-xs">Testovací e-mail</Label>
            <p className="text-xs text-muted-foreground">
              Odešle náhled zvolené šablony na zadanou adresu — bez záznamu kampaně.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@příklad.cz"
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={
                  sendingTest ||
                  !templateId ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())
                }
              >
                {sendingTest ? "Odesílám..." : "Odeslat test"}
              </Button>
            </div>
          </div>
        </div>

        {/* Náhled */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Náhled šablony
          </p>
          {templateId ? (
            <div className="overflow-hidden rounded border bg-[#f1f5f9]">
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                className="h-[70vh] w-full border-0 lg:h-[calc(100vh-12rem)]"
                title="Náhled e-mailu"
              />
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Vyberte šablonu pro náhled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
