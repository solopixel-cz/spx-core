"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface MarketingEmailDialogProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  templates: TemplateSummary[];
  /** Předvyplněný odkaz (např. deployUrl vizitky) — vždy editovatelný. */
  defaultLink?: string;
  trigger: React.ReactElement;
}

export function MarketingEmailDialog({
  clientId,
  clientName,
  clientEmail,
  templates,
  defaultLink = "",
  trigger,
}: MarketingEmailDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates.length === 1 ? templates[0].id : ""
  );
  const [odkaz, setOdkaz] = useState(defaultLink);
  const [greeting, setGreeting] = useState(firstName(clientName));
  const [sending, setSending] = useState(false);

  // HTML vybrané šablony se dotahuje on-demand kvůli náhledu.
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(false);

  const usesOdkaz =
    templateHtml.includes("{{odkaz}}") || templateSubject.includes("{{odkaz}}");
  const linkInvalid = odkaz.trim() !== "" && !/^https?:\/\//i.test(odkaz.trim());

  async function loadTemplate(id: string) {
    setSelectedTemplateId(id);
    setTemplateHtml("");
    setTemplateSubject("");
    if (!id) return;
    setLoadingHtml(true);
    try {
      const res = await fetch(`/api/email-templates/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplateHtml((data.html as string) ?? "");
      setTemplateSubject((data.subject as string) ?? "");
    } catch {
      toast.error("Nepodařilo se načíst šablonu");
    } finally {
      setLoadingHtml(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setSelectedTemplateId("");
      setOdkaz(defaultLink);
      setGreeting(firstName(clientName));
      setTemplateHtml("");
      setTemplateSubject("");
      setSending(false);
      if (templates.length === 1) loadTemplate(templates[0].id);
    }
    setOpen(newOpen);
  }

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
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat e-mail");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Poslat e-mail klientovi</DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zatím nemáte žádné šablony. Vytvořte je v sekci{" "}
            <span className="font-medium">Email marketing → Šablony</span>.
          </p>
        ) : (
          <div className="space-y-4">
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
                Nahradí <code>{"{{odkaz}}"}</code> — např. náhled vizitky na Vercelu
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
                      style={{ height: "400px" }}
                      title="Náhled e-mailu"
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Příjemce: <span className="font-medium">{clientEmail}</span>
                </div>
              </div>
            )}

            <Button onClick={handleSend} disabled={!canSend} className="w-full">
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sending ? "Odesílám..." : "Odeslat e-mail"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
