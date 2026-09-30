"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { personalizeTemplate, firstName } from "@/lib/marketing/personalize";

interface TemplateSummary {
  id: string;
  name: string;
  subject?: string | null;
}

interface SendEmailFormProps {
  clientId: string;
  clientName: string;
  /** Výchozí oslovení (lze upravit). */
  defaultGreeting?: string;
  clientEmail: string;
  templates: TemplateSummary[];
  /** Předvyplněný odkaz (např. deployUrl vizitky) — vždy editovatelný. */
  defaultLink?: string;
  backHref: string;
}

/**
 * E-mail klientovi ze šablony jako routa `/clients/[id]/send/email`: výběr
 * šablony, oslovení, odkaz a živý náhled.
 */
export function SendEmailForm({
  clientId,
  clientName,
  defaultGreeting,
  clientEmail,
  templates,
  defaultLink = "",
  backHref,
}: SendEmailFormProps) {
  const router = useRouter();
  // Jediná šablona = rovnou vybraná (náhled se dotáhne v efektu níže).
  const initialTemplateId = templates.length === 1 ? templates[0].id : "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [odkaz, setOdkaz] = useState(defaultLink);
  const [greeting, setGreeting] = useState(
    defaultGreeting ?? firstName(clientName),
  );
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);

  // HTML vybrané šablony se dotahuje on-demand kvůli náhledu.
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(!!initialTemplateId);

  const usesOdkaz =
    templateHtml.includes("{{odkaz}}") || templateSubject.includes("{{odkaz}}");
  const linkInvalid =
    odkaz.trim() !== "" && !/^https?:\/\//i.test(odkaz.trim());

  // HTML + předmět šablony pro náhled; stav se nastavuje až v callbacku.
  function fetchTemplate(id: string) {
    return fetch(`/api/email-templates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: { html?: string; subject?: string }) => {
        setTemplateHtml(data.html ?? "");
        setTemplateSubject(data.subject ?? "");
      })
      .catch(() => toast.error("Nepodařilo se načíst šablonu"))
      .finally(() => setLoadingHtml(false));
  }

  function loadTemplate(id: string) {
    setSelectedTemplateId(id);
    setTemplateHtml("");
    setTemplateSubject("");
    if (!id) return;
    setLoadingHtml(true);
    void fetchTemplate(id);
  }

  useEffect(() => {
    if (initialTemplateId) void fetchTemplate(initialTemplateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewVars = {
    jmeno: greeting || firstName(clientName),
    email: clientEmail,
    odkaz: odkaz.trim(),
  };
  const previewHtml = templateHtml
    ? personalizeTemplate(templateHtml, previewVars)
    : "";

  const canSend =
    !!selectedTemplateId &&
    !!greeting.trim() &&
    !linkInvalid &&
    !(usesOdkaz && !odkaz.trim()) &&
    !sending &&
    !loadingHtml;

  async function handleSend() {
    if (inFlight.current) return; // pojistka proti dvojkliku (i rychlému, před re-renderem)
    inFlight.current = true;
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_marketing_email",
          templateId: selectedTemplateId,
          odkaz: odkaz.trim(),
          greeting: greeting.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }
      toast.success("E-mail odeslán klientovi");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat e-mail");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Zatím nemáte žádné šablony. Vytvořte je v sekci{" "}
        <span className="font-medium">Email marketing → Šablony</span>.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Šablona</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={(val) => loadTemplate(val ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vyberte šablonu" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Oslovení (5. pád)</Label>
        <Input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Např. Jane, Honzo..."
        />
        <p className="text-xs text-muted-foreground">
          Nahradí <code>{"{{jmeno}}"}</code> v šabloně.
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Odkaz {usesOdkaz && <span className="text-destructive">*</span>}
        </Label>
        <Input
          value={odkaz}
          onChange={(e) => setOdkaz(e.target.value)}
          placeholder="https://nahled.vercel.app/..."
        />
        <p className="text-xs text-muted-foreground">
          Nahradí <code>{"{{odkaz}}"}</code>, např. náhled vizitky na Vercelu
          (pro každé odeslání jiný).
        </p>
        {linkInvalid && (
          <p className="text-xs text-destructive">
            Odkaz musí začínat http:// nebo https://
          </p>
        )}
      </div>

      <Separator />

      {selectedTemplateId && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Náhled e-mailu
          </p>
          <div className="rounded border overflow-hidden bg-[#F1F5F9]">
            {loadingHtml ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                className="w-full border-0"
                style={{ height: "520px" }}
                title="Náhled e-mailu"
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Příjemce: <span className="font-medium">{clientEmail}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSend} disabled={!canSend}>
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {sending ? "Odesílám..." : "Odeslat e-mail"}
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          disabled={sending}
          render={<Link href={backHref} />}
        >
          Zrušit
        </Button>
      </div>
    </div>
  );
}
