"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/form-actions";

/** Nový seznam kontaktů (`/email-marketing/lists/new`); po vytvoření vede na jeho detail. */
export function NewListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/marketing/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { id: string };
      toast.success("Seznam vytvořen");
      router.push(`/email-marketing/lists/${data.id}`);
    } catch {
      toast.error("Nepodařilo se vytvořit seznam");
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="list-name">Název *</Label>
        <Input
          id="list-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Např. Řemeslníci Praha"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="list-desc">Popis</Label>
        <Textarea
          id="list-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Volitelný popis seznamu"
        />
      </div>
      <FormActions
        cancelHref="/email-marketing?tab=lists"
        submitting={creating}
        submittingLabel="Vytvářím..."
        disabled={!name.trim()}
        submitLabel="Vytvořit a přidat kontakty"
      />
    </form>
  );
}
