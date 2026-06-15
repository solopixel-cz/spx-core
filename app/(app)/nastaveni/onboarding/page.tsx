"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";

interface Step {
  title: string;
  offsetDays: number;
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/templates/onboarding")
      .then((res) => (res.ok ? res.json() : { steps: [] }))
      .then((data) => setSteps(data.steps || []))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  if (loading) return <p className="text-muted-foreground">Načítám...</p>;

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
    </div>
  );
}
