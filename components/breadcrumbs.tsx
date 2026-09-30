import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/back-button";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Drobečková navigace — cesta k aktuální stránce. Poslední položka je aktuální
 * (bez odkazu). Používá se na detailech a vnořených stránkách, kde dává smysl
 * ukázat hierarchii; ne na seznamech (kořeny) ani tam, kde kontext plyne odjinud.
 *
 * `backHref` = před drobečky se zobrazí šipka zpět (jednotné místo pro návrat
 * na detailech, nezabírá vlastní řádek).
 */
export function Breadcrumbs({
  items,
  backHref,
  className,
}: {
  items: Crumb[];
  backHref?: string;
  className?: string;
}) {
  const nav = (
    <nav
      aria-label="Drobečková navigace"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn("truncate", isLast && "font-medium text-foreground")}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-4 w-4 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );

  if (!backHref) return nav;
  return (
    <div className="-mt-1.5 mb-2 flex min-w-0 items-center gap-1">
      <BackButton href={backHref} compact className="-ml-2.5 shrink-0" />
      {nav}
    </div>
  );
}
