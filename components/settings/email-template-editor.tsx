"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Send } from "lucide-react";

interface EmailTemplateEditorProps {
  apiPath: string;
  renderEmail: (vars: { jmeno: string; odkaz: string }) => { html: string };
  defaultSubject: string;
  placeholderHint: string;
  sampleVars: { jmeno: string; odkaz: string };
  label: string;
}

export function EmailTemplateEditor({
  apiPath,
  renderEmail,
  defaultSubject,
  placeholderHint,
  sampleVars,
  label,
}: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetch(apiPath)
      .then((res) => (res.ok ? res.json() : { subject: "" }))
      .then((data) => setSubject(data.subject || ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiPath]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} uložena`);
    } catch {
      toast.error("Nepodařilo se uložit šablonu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!subject.trim()) {
      toast.error("Vyplňte předmět");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Chyba");
      }
      toast.success("Testovací e-mail odeslán na vaši adresu");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se odeslat");
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Načítám...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {placeholderHint}
        {" "}Testovací e-mail se pošle na vaši adresu.
      </p>

      <div className="space-y-2">
        <Label>Předmět</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={defaultSubject}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendTest}
          disabled={sendingTest || !subject.trim()}
        >
          <Send className="mr-2 h-4 w-4" />
          {sendingTest ? "Odesílám..." : "Testovací e-mail"}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Ukládám..." : "Uložit"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Náhled e-mailu</Label>
        <div className="rounded-lg border overflow-hidden bg-[#F1F5F9]">
          <iframe
            srcDoc={renderEmail(sampleVars).html}
            sandbox=""
            className="w-full border-0"
            style={{ height: "600px" }}
            title={`Náhled — ${label}`}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tělo e-mailu je ve fixním brandingu SoloPixel — editovatelný je jen předmět.
        </p>
      </div>
    </div>
  );
}
