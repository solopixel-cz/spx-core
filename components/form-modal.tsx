"use client";

import { createContext, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const InFormModal = createContext(false);

/** Je formulář v modálu? Zrušit pak zavře modál a uložení nepřidá krok do historie. */
export function useInFormModal() {
  return useContext(InFormModal);
}

/**
 * Formulářová routa jako modál (`app/(app)/@modal/(.)…`): hlavička jako
 * u detailu ticketu (otevřít na celé stránce, zavřít) a formulář. Zavření
 * (X, Esc, klik mimo) vrací zpět; napřímo se adresa otevře jako stránka.
 */
export function FormModal({
  title,
  description,
  pageHref,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Stejný formulář na samostatné stránce. */
  pageHref: string;
  /** Např. šířka (`sm:max-w-3xl`). */
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DialogContent
        showCloseButton={false}
        // Fokus do prvního pole formuláře, ne na ikonu v hlavičce.
        initialFocus={() => bodyRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, button") ?? true}
        className={cn("gap-0 p-0 pb-0 sm:max-w-2xl sm:p-0 sm:pb-0", className)}>
        <header className="flex items-start gap-2 border-b p-4 md:px-6 md:py-5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl font-bold tracking-tight md:text-2xl">{title}</DialogTitle>
            {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Plné načtení stránky, jinak by se odkaz znovu otevřel v modálu. */}
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<a href={pageHref} />}
              title="Otevřít na celé stránce"
              aria-label="Otevřít na celé stránce"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => router.back()} title="Zavřít" aria-label="Zavřít">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div ref={bodyRef} className="p-4 pb-6 md:px-6 md:py-5">
          <InFormModal.Provider value={true}>{children}</InFormModal.Provider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
