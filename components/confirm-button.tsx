"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost";

/**
 * Inline potvrzení nevratné akce, bez modálového okna. Klik na tlačítko ho na
 * místě rozbalí na „<otázka> [Potvrdit] [Zrušit]". Používá se pro nevratné akce
 * (trvalé smazání, storno), kde nestačí Undo toast.
 */
export function ConfirmButton({
  onConfirm,
  children,
  question = "Opravdu?",
  confirmLabel = "Potvrdit",
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

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{question}</span>
      <Button
        type="button"
        variant={confirmVariant}
        size={size}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {confirmLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={busy}
        onClick={() => setArmed(false)}
      >
        Zrušit
      </Button>
    </div>
  );
}
