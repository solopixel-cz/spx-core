"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

// Kurátorovaná sada emoji vhodných pro CRM úkoly (fakturace, kontakt, priority…).
const EMOJIS = [
  "📋", "✅", "🧾", "💰", "💳", "📞", "📧", "📅",
  "🔔", "⏰", "🔁", "📌", "⭐", "🔥", "🚀", "🎯",
  "⚠️", "❗", "💡", "🛠️", "🐛", "📝", "👤", "🤝",
  "💬", "📦", "🎉", "❤️", "👍", "📈", "🏆", "🏷️",
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        title="Vložit emoji"
        aria-label="Vložit emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 grid w-64 grid-cols-8 gap-0.5 rounded-lg border bg-popover p-2 shadow-md ring-1 ring-foreground/10">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded-md p-1 text-lg leading-none transition-colors hover:bg-accent"
              onClick={() => {
                onSelect(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
