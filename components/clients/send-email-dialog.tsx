"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { personalizeTemplate } from "@/lib/marketing/personalize";
import {
  SYSTEM_TEMPLATES,
  SYSTEM_TEMPLATE_PREFIX,
  getSystemTemplate,
} from "@/lib/email-templates/system";

interface CustomTemplate {
  id: string;
  name: string;
  subject: string | null;
  html: string;
}

const CLIENT_SYSTEM_TEMPLATES = SYSTEM_TEMPLATES.filter((t) => t.forClients);

/**
 * Modál „Poslat e-mail ze šablony“ v detailu klienta: hotové šablony
 * (formulář, připomenutí, předání) i vlastní z Email marketingu, oslovení,
 * odkaz a živý náhled.
 */
export function SendEmailDialog({
  open,
  onOpenChange,
  clientId,
  clientEmail,
  defaultGreeting,
  defaultLink = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientEmail: string;
  /** Oslovení v 5. pádě, jde upravit. */
  defaultGreeting: string;
  /** Předvyplněný odkaz (deployUrl vizitky), jde upravit. */
  defaultLink?: string;
}) {
  const router = useRouter();
  const [custom, setCustom] = useState<CustomTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [greeting, setGreeting] = useState(defaultGreeting);
  const [odkaz, setOdkaz] = useState(defaultLink);
  const [systemSubject, setSystemSubject] = useState("");
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);

  // Vlastní šablony se načtou při prvním otevření.
  useEffect(() => {
    if (!open || custom) return;
    fetch("/api/email-templates")
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((data: { templates?: CustomTemplate[] }) => setCustom(data.templates ?? []))
      .catch(() => setCustom([]));
  }, [open, custom]);

  const systemTpl = templateId.startsWith(SYSTEM_TEMPLATE_PREFIX)
    ? getSystemTemplate(templateId.slice(SYSTEM_TEMPLATE_PREFIX.length))
    : undefined;
  const customTpl = custom?.find((t) => t.id === templateId);

  function selectTemplate(id: string) {
    setTemplateId(id);
    const sys = id.startsWith(SYSTEM_TEMPLATE_PREFIX)
      ? getSystemTemplate(id.slice(SYSTEM_TEMPLATE_PREFIX.length))
      : undefined;
    if (!sys) return;
    // U hotové šablony je v CRM uložený jen předmět.
    setSystemSubject(sys.defaultSubject);
    setLoadingSubject(true);
    fetch(`/api/templates/${sys.docId}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { subject?: string }) => setSystemSubject(data.subject || sys.defaultSubject))
      .catch(() => {})
      .finally(() => setLoadingSubject(false));
  }

  const link = odkaz.trim();
  const usesOdkaz =
    !!systemTpl ||
    !!customTpl?.html.includes("{{odkaz}}") ||
    !!customTpl?.subject?.includes("{{odkaz}}");
  const linkInvalid = link !== "" && !/^https?:\/\//i.test(link);
  const vars = { jmeno: greeting.trim(), email: clientEmail, odkaz: link };

  const subjectTemplate = systemTpl ? systemSubject : (customTpl?.subject || customTpl?.name || "");
  const subject = subjectTemplate ? personalizeTemplate(subjectTemplate, vars) : "";
  const previewHtml = systemTpl
    ? systemTpl.render({ jmeno: vars.jmeno, odkaz: link || systemTpl.sampleLink }).html
    : customTpl
      ? personalizeTemplate(customTpl.html, vars)
      : "";

  const canSend =
    !!templateId &&
    !!greeting.trim() &&
    !linkInvalid &&
    !(usesOdkaz && !link) &&
    !loadingSubject &&
    !sending;

  async function handleSend() {
    if (inFlight.current) return; // pojistka proti dvojkliku
    inFlight.current = true;
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_marketing_email",
          templateId,
          odkaz: link,
          greeting: greeting.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(`E-mail odeslán na ${clientEmail}`);
      onOpenChange(false);
      setTemplateId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Nepodařilo se odeslat e-mail");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  const items: Record<string, string> = Object.fromEntries([
    ...CLIENT_SYSTEM_TEMPLATES.map((t) => [SYSTEM_TEMPLATE_PREFIX + t.key, t.name]),
    ...(custom ?? []).map((t) => [t.id, t.name]),
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="gap-0 p-0 sm:max-w-5xl sm:p-0 sm:pb-0">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5 text-muted-foreground" />
            Poslat e-mail ze šablony
          </DialogTitle>
          <DialogDescription>
            Příjemce: <span className="font-medium text-foreground">{clientEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Šablona</Label>
              <Select items={items} value={templateId} onValueChange={(v) => selectTemplate(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Vyberte šablonu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Hotové šablony</SelectLabel>
                    {CLIENT_SYSTEM_TEMPLATES.map((t) => (
                      <SelectItem key={t.key} value={SYSTEM_TEMPLATE_PREFIX + t.key}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Vlastní šablony</SelectLabel>
                    {custom === null ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Načítám…</p>
                    ) : custom.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Zatím žádné</p>
                    ) : (
                      custom.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {systemTpl && <p className="text-xs text-muted-foreground">{systemTpl.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-greeting">Oslovení (5. pád)</Label>
              <Input
                id="send-greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Např. Jane, Honzo…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-link">
                Odkaz {usesOdkaz && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="send-link"
                value={odkaz}
                onChange={(e) => setOdkaz(e.target.value)}
                placeholder="https://…"
                aria-invalid={linkInvalid || undefined}
              />
              <p className={linkInvalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {linkInvalid
                  ? "Odkaz musí začínat http:// nebo https://"
                  : systemTpl
                    ? `Vložte ${systemTpl.linkHint}.`
                    : "Dosadí se za {{odkaz}}, např. náhled vizitky."}
              </p>
            </div>

            {subject && (
              <div className="space-y-1 rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Předmět</p>
                <p className="text-sm font-medium leading-snug">{subject}</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border bg-[#F1F5F9]">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                className="h-[22rem] w-full border-0 md:h-[60dvh]"
                title="Náhled e-mailu"
              />
            ) : (
              <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-slate-500 md:h-[60dvh]">
                {custom === null && templateId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Vyberte šablonu a tady uvidíte náhled e-mailu."
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 px-5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Zrušit
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? "Odesílám…" : "Odeslat e-mail"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
