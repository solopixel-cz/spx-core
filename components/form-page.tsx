import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * Layout formulářové / akční routy (fáze 33, náhrada modálů). Drobečky se
 * šipkou zpět, titulek, volitelný popis a obsah v omezené šířce. Stejně na
 * desktopu i mobilu.
 */
export function FormPage({
  backHref,
  breadcrumbs,
  title,
  description,
  wide = false,
  children,
}: {
  backHref: string;
  breadcrumbs: Crumb[];
  title: string;
  description?: React.ReactNode;
  /** Širší obsah (náhledy e-mailů, tabulky). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs backHref={backHref} items={breadcrumbs} />
      <div className={cn("space-y-6", wide ? "max-w-4xl" : "max-w-2xl")}>
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
