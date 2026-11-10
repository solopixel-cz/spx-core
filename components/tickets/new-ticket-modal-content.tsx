"use client";

import { useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketForm } from "@/components/tickets/ticket-form";

type FormProps = React.ComponentProps<typeof TicketForm>;

/** Obsah modálu nového ticketu: hlavička jako u detailu (celá stránka, zavřít) a formulář. */
export function NewTicketModalContent({
  pageHref,
  ...props
}: Pick<FormProps, "clients" | "users" | "instances" | "defaultClientId" | "allowInternal"> & {
  /** Stejný formulář na samostatné stránce. */
  pageHref: string;
}) {
  const router = useRouter();
  return (
    <div>
      <header className="flex items-center gap-2 border-b p-4 md:px-6 md:py-5">
        <h1 className="min-w-0 flex-1 text-xl font-bold tracking-tight md:text-2xl">Nový ticket</h1>
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
      <div className="p-4 md:px-6 md:py-5">
        <TicketForm {...props} backHref="/backlog" inModal />
      </div>
    </div>
  );
}
