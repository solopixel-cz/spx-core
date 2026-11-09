"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Obal detailu ticketu v modálu: zavření (X, Esc, klik mimo) vrací zpět na předchozí stránku. */
export function TicketModal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-5xl sm:p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
