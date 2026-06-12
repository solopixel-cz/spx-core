"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Send } from "lucide-react";

interface Step {
  title: string;
  offsetDays: number;
}

export default function SablonyPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Outreach email template
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetch("/api/templates/onboarding")
      .then((res) => (res.ok ? res.json() : { steps: [] }))
      .then((data) => setSteps(data.steps || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/templates/outreach-email")
      .then((res) => (res.ok ? res.json() : { subject: "", body: "" }))
      .then((data) => {
        setEmailSubject(data.subject || "");
        setEmailBody(data.body || "");
      })
      .catch(() => {})
      .finally(() => setEmailLoading(false));
  }, []);

  function addStep() {
    setSteps((prev) => [...prev, { title: "", offsetDays: 0 }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/templates/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: steps.filter((s) => s.title.trim()) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Šablona uložena");
    } catch {
      toast.error("Nepodařilo se uložit šablonu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmail() {
    setEmailSaving(true);
    try {
      const res = await fetch("/api/templates/outreach-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });
      if (!res.ok) throw new Error();
      toast.success("Šablona oslovení uložena");
    } catch {
      toast.error("Nepodařilo se uložit šablonu");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSendTest() {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Vyplňte předmět i tělo šablony");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/templates/outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
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

  if (loading && emailLoading) return <p className="text-muted-foreground">Načítám...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Onboarding šablona</h2>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Ukládám..." : "Uložit"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Kroky se automaticky vygenerují jako úkoly při výhře leadu. Offset = počet dní od konverze.
      </p>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>Krok {i + 1}</Label>
              <Input
                value={step.title}
                onChange={(e) => updateStep(i, "title", e.target.value)}
                placeholder="Název kroku"
              />
            </div>
            <div className="w-24 space-y-1">
              <Label>Offset (dny)</Label>
              <Input
                type="number"
                value={step.offsetDays}
                onChange={(e) =>
                  updateStep(i, "offsetDays", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeStep(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addStep}>
        <Plus className="mr-2 h-4 w-4" />
        Přidat krok
      </Button>

      <Separator className="my-8" />

      {/* Outreach email template */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Šablona oslovení</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest || !emailSubject.trim() || !emailBody.trim()}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendingTest ? "Odesílám..." : "Testovací e-mail"}
            </Button>
            <Button size="sm" onClick={handleSaveEmail} disabled={emailSaving}>
              <Save className="mr-2 h-4 w-4" />
              {emailSaving ? "Ukládám..." : "Uložit"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Šablona e-mailu pro oslovení prospektů. Použijte placeholdery{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{jmeno}}"}</code> (oslovení, 5. pád) a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{odkaz}}"}</code> (odkaz na demo vizitku).
          Testovací e-mail se pošle na vaši adresu s ukázkovými hodnotami.
        </p>

        <div className="space-y-2">
          <Label>Předmět</Label>
          <Input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Např. Digitální vizitka pro vás, {{jmeno}}"
          />
        </div>

        <div className="space-y-2">
          <Label>Tělo e-mailu</Label>
          <Textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder={"Dobrý den {{jmeno}},\n\nrádi bychom vám představili...\n\nPodívejte se na ukázku: {{odkaz}}\n\nS pozdravem\nJméno Příjmení\nSoloPixel s.r.o.\n\nPokud si nepřejete být dále kontaktováni, odpovězte na tento e-mail."}
            rows={12}
            className="font-mono text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Compliance: E-mail by měl obsahovat plný podpis s identifikací firmy a větu
          s možností odmítnout další kontakt.
        </p>
      </div>
    </div>
  );
}
