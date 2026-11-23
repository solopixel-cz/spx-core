"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { navMatch } from "@/lib/nav";

interface PageHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  /**
   * Drobečky nad titulkem. Výchozí = sekce menu › stránka (podle cesty),
   * `false` = bez drobečků (stránka má vlastní `<Breadcrumbs>` nebo je to Dashboard).
   */
  crumbs?: Crumb[] | false;
  /** Pod titulkem: záložky, filtry (leží na plátně, ne v bílém povrchu). */
  children?: React.ReactNode;
}

/** Hlavička stránky na plátně: drobečky, titulek a akce vpravo. */
export function PageHeader({ title, action, crumbs, children }: PageHeaderProps) {
  const pathname = usePathname();
  const items = crumbs === undefined ? sectionCrumbs(pathname) : crumbs;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {items && items.length > 0 && <Breadcrumbs items={items} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 font-heading text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function sectionCrumbs(pathname: string): Crumb[] | null {
  const match = navMatch(pathname);
  // Bez sekce (Nastavení) by drobeček jen opakoval titulek.
  if (!match?.group.title) return null;
  return [{ label: match.group.title }, { label: match.item.label, href: match.item.href }];
}
