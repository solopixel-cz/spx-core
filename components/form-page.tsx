"use client";

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { FormModal, useInModalScope } from "@/components/form-modal";
import { cn } from "@/lib/utils";

/**
 * Layout formulářové / akční routy (fáze 33). Drobečky se šipkou zpět,
 * titulek, volitelný popis a obsah v omezené šířce. Pod modální routou
 * (`FormModalScope` v `app/(app)/@modal/(.)…`) se stejná stránka vykreslí
 * jako modál s odkazem na celou stránku.
 */
export function FormPage({
  backHref,
  breadcrumbs,
  title,
  description,
  wide = false,
  full = false,
  children,
}: {
  backHref: string;
  breadcrumbs: Crumb[];
  title: string;
  description?: React.ReactNode;
  /** Širší obsah (náhledy e-mailů, tabulky). */
  wide?: boolean;
  /** Obsah přes celou šířku (faktura s položkami a souhrnem). */
  full?: boolean;
  children: React.ReactNode;
}) {
  if (useInModalScope()) {
    return (
      <FormModal title={title} description={description} className={full ? "sm:max-w-6xl" : wide ? "sm:max-w-5xl" : undefined}>
        {children}
      </FormModal>
    );
  }
  return (
    <div className="space-y-6">
      <Breadcrumbs backHref={backHref} items={breadcrumbs} />
      <div className={cn("space-y-6", full ? undefined : wide ? "max-w-4xl" : "max-w-2xl")}>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
