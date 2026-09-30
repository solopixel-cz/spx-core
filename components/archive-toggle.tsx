"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Přepínač seznamu: aktivní záznamy ↔ archiv (`?archived=1`). */
export function ArchiveToggle({ archived, className }: { archived: boolean; className?: string }) {
  const pathname = usePathname();
  return archived ? (
    <Link href={pathname} className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Zpět na aktivní
    </Link>
  ) : (
    <Link
      href={`${pathname}?archived=1`}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)}
    >
      <Archive className="mr-2 h-4 w-4" />
      Archiv
    </Link>
  );
}

/** Pruh nad tabulkou archivu. */
export function ArchiveNotice({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <Archive className="h-4 w-4 shrink-0" />
      <span>
        Archiv ({count}). Vyberte záznamy a obnovte je. Trvalé mazání je v Nastavení → Archiv.
      </span>
    </div>
  );
}
