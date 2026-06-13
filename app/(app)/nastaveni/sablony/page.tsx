"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { renderOutreachEmail } from "@/lib/email-templates/outreach";

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
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Commission settings
  const [defaultRate, setDefaultRate] = useState(20);
  const [commSaving, setCommSaving] = useState(false);

  useEffect(() => {
    fetch("/api/templates/onboarding")
      .then((res) => (res.ok ? res.json() : { steps: [] }))
      .then((data) => setSteps(data.steps || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/templates/outreach-email")
      .then((res) => (res.ok ? res.json() : { subject: "" }))
      .then((data) => {
        setEmailSubject(data.subject || "");
      })
      .catch(() => {})
      .finally(() => setEmailLoading(false));

    fetch("/api/settings/commission")
      .then((res) => (res.ok ? res.json() : { defaultRate: 0.2 }))
      .then((data) => setDefaultRate(Math.round((data.defaultRate ?? 0.2) * 100)))
      .catch(() => {});
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
        body: JSON.stringify({ subject: emailSubject }),
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
    if (!emailSubject.trim()) {
      toast.error("Vyplňte předmět");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/templates/outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject }),
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
              disabled={sendingTest || !emailSubject.trim()}
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
          Editovatelný je jen předmět — tělo e-mailu je v jednotném designu SoloPixel.
          Placeholdery:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{jmeno}}"}</code> (oslovení, 5. pád),{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{odkaz}}"}</code> (demo URL).
          Testovací e-mail se pošle na vaši adresu.
        </p>

        <div className="space-y-2">
          <Label>Předmět</Label>
          <Input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="{{jmeno}}, takhle dnes vypadá vizitka, co pracuje za vás"
          />
        </div>

        <div className="space-y-2">
          <Label>Náhled e-mailu</Label>
          <div className="rounded-lg border overflow-hidden bg-[#F1F5F9]">
            <iframe
              srcDoc={renderOutreachEmail({ jmeno: "Jan Nováku", odkaz: "https://demo.solopixel.cz" }).html}
              sandbox=""
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Náhled e-mailu"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tělo je fixní — obsahuje branding SoloPixel, compliance patičku a kontaktní údaje.
          </p>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Commission default rate */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Provize</h2>
          <Button
            size="sm"
            onClick={async () => {
              setCommSaving(true);
              try {
                const res = await fetch("/api/settings/commission", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ defaultRate: defaultRate / 100 }),
                });
                if (!res.ok) throw new Error();
                toast.success("Sazba uložena");
              } catch {
                toast.error("Nepodařilo se uložit sazbu");
              } finally {
                setCommSaving(false);
              }
            }}
            disabled={commSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {commSaving ? "Ukládám..." : "Uložit"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Výchozí sazba provize pro obchodníky. Individuální sazbu lze nastavit u každého uživatele v sekci Uživatelé.
        </p>

        <div className="flex items-center gap-2 w-40">
          <Input
            type="number"
            min={0}
            max={100}
            value={defaultRate}
            onChange={(e) => setDefaultRate(parseInt(e.target.value) || 0)}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}
