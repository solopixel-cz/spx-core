"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("cs");
}

/**
 * Inline potvrzení nevratné akce, bez modálového okna. Klik na tlačítko ho na
 * místě rozbalí na „<otázka> [Potvrdit] [Zrušit]". Používá se pro nevratné akce
 * (trvalé smazání, storno), kde nestačí Undo toast.
 *
 * S `confirmPhrase` je potvrzení silnější: tlačítko se odemkne až po opsání
 * fráze (typicky jméno klienta) — proti omylu u akcí s velkým dopadem.
 */
export function ConfirmButton({
  onConfirm,
  children,
  question = "Opravdu?",
  confirmLabel = "Potvrdit",
  confirmPhrase,
  variant = "destructive",
  confirmVariant = "destructive",
  size = "sm",
  disabled,
  className,
}: {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  question?: string;
  confirmLabel?: string;
  /** Text, který musí uživatel opsat, aby šlo potvrdit (bez ohledu na velikost písmen). */
  confirmPhrase?: string;
  /** Vzhled spouštěcího tlačítka. */
  variant?: Variant;
  /** Vzhled potvrzovacího tlačítka (výchozí destruktivní). */
  confirmVariant?: Variant;
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  const phraseOk = !confirmPhrase || normalize(typed) === normalize(confirmPhrase);

  function disarm() {
    setArmed(false);
    setTyped("");
  }

  async function confirm() {
    if (!phraseOk || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      disarm();
    }
  }

  if (!armed) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => setArmed(true)}
      >
        {children}
      </Button>
    );
  }

  const buttons = (
    <>
      <Button
        type="button"
        variant={confirmVariant}
        size={size}
        disabled={busy || !phraseOk}
        onClick={confirm}
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size={size} disabled={busy} onClick={disarm}>
        Zrušit
      </Button>
    </>
  );

  if (confirmPhrase) {
    return (
      <div
        className={cn(
          "flex w-full flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:w-auto dark:border-amber-700 dark:bg-amber-950",
          className
        )}
      >
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{question}</span>
        <label className="text-xs text-amber-700 dark:text-amber-400">
          Pro potvrzení napište <strong>{confirmPhrase}</strong>
        </label>
        <Input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void confirm();
            if (e.key === "Escape") disarm();
          }}
          placeholder={confirmPhrase}
          className="bg-background text-foreground"
        />
        <div className="flex flex-wrap items-center gap-2">{buttons}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{question}</span>
      {buttons}
    </div>
  );
}
