"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, X } from "lucide-react";

const NONE = "__none__";

/**
 * Výběr kategorie kontaktu (Řemeslník, Finanční poradce, …) s možností
 * vytvořit novou — nová se hned uloží do Firestore (kolekce prospectCategories).
 * Sám si načítá seznam kategorií a je znovupoužitelný na více místech.
 */
export function CategorySelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/prospect-categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.categories) setCategories(data.categories);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  // Aktuální hodnota nemusí být v seznamu (např. dřív smazaná kategorie) — přidáme ji.
  const options =
    value && !categories.some((c) => c.toLowerCase() === value.toLowerCase())
      ? [value, ...categories]
      : categories;

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prospect-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const canonical = (data.name as string) || name;
      setCategories((prev) =>
        prev.some((c) => c.toLowerCase() === canonical.toLowerCase())
          ? prev
          : [...prev, canonical].sort((a, b) => a.localeCompare(b, "cs"))
      );
      onChange(canonical);
      setCreating(false);
      setNewName("");
      if (!data.existed) toast.success(`Kategorie „${canonical}" vytvořena`);
    } catch {
      toast.error("Nepodařilo se vytvořit kategorii");
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div className={className}>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setCreating(false);
                setNewName("");
              }
            }}
            placeholder="Název nové kategorie"
            disabled={saving}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            title="Uložit kategorii"
            aria-label="Uložit kategorii"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            disabled={saving}
            title="Zrušit"
            aria-label="Zrušit"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Select
          value={value || NONE}
          onValueChange={(val) => val && onChange(val === NONE ? "" : val)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bez kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Bez kategorie</SelectItem>
            {options.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCreating(true)}
          disabled={disabled}
          title="Nová kategorie"
          aria-label="Nová kategorie"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
