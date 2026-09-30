"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Patička formulářové routy: primární akce + „Zrušit" (odkaz zpět). Na mobilu
 * lepí ke spodnímu okraji, aby byla akce vždy po ruce; na desktopu je v toku.
 */
export function FormActions({
  cancelHref,
  submitLabel = "Uložit",
  submittingLabel = "Ukládám...",
  submitting = false,
  disabled = false,
  onSubmit,
  icon,
  children,
}: {
  cancelHref: string;
  submitLabel?: string;
  submittingLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
  /** Bez `onSubmit` je tlačítko `type="submit"` (odešle obalující `<form>`). */
  onSubmit?: () => void;
  icon?: React.ReactNode;
  /** Další akce na opačném konci lišty (např. smazání). */
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-wrap items-center gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:p-0 md:pt-2 md:backdrop-blur-none">
      <Button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        disabled={submitting || disabled}
        className="min-w-28"
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {submitting ? submittingLabel : submitLabel}
      </Button>
      <Button
        variant="ghost"
        nativeButton={false}
        disabled={submitting}
        render={<Link href={cancelHref} />}
      >
        Zrušit
      </Button>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
