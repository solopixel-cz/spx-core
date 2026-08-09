"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Mobilní kartový vzor pro seznamy (tabulka na desktopu → karty na mobilu).
 *
 * Použití: desktop tabulku obalit `hidden md:block`, vedle ní vykreslit
 * `<EntityCardList>` s `<EntityCard>` pro každý řádek (stejná data, stejné
 * filtry). List je defaultně `md:hidden`.
 *
 * Klikatelnost řeší "stretched link" přes titulek — celá karta je tap-target,
 * ale uvnitř mohou být další interaktivní prvky (tlačítka, odkazy). Ty musí
 * mít třídu `relative`, aby zůstaly klikatelné nad overlay vrstvou.
 */
export function EntityCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 md:hidden", className)}>
      {children}
    </div>
  );
}

export function EntityCardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

interface EntityCardProps {
  /** Celá karta jako odkaz (detailová stránka) */
  href?: string;
  /** Celá karta jako tlačítko (otevření sheetu/dialogu) */
  onClick?: () => void;
  title: React.ReactNode;
  /** Badge vpravo od titulku (stav, fáze…) */
  badge?: React.ReactNode;
  /** Druhý řádek — firma, e-mail apod. */
  subtitle?: React.ReactNode;
  /** Drobná metadata dole — položky oddělené mezerou */
  meta?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function EntityCard({
  href,
  onClick,
  title,
  badge,
  subtitle,
  meta,
  children,
  className,
}: EntityCardProps) {
  const interactive = Boolean(href || onClick);

  // Stretched link/button — roztažený přes celou kartu pomocí after overlay
  const stretchClass = "text-left after:absolute after:inset-0 after:content-['']";
  const titleNode = href ? (
    <Link href={href} className={stretchClass}>
      {title}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={stretchClass}>
      {title}
    </button>
  ) : (
    title
  );

  return (
    <div
      className={cn(
        "relative min-w-0 rounded-2xl border bg-card p-4 shadow-xs transition-all",
        interactive &&
          "hover:border-primary/40 active:scale-[0.98] active:bg-muted/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate font-medium leading-snug">
          {titleNode}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
      </div>
      {subtitle && (
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {subtitle}
        </div>
      )}
      {children}
      {meta && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta}
        </div>
      )}
    </div>
  );
}
