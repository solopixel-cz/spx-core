import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Jednotné tlačítko „zpět" — ghost ikona se šipkou, která vede na nadřazenou
 * stránku (`href`). Na detailech sedí v řádku drobečkové navigace
 * (`<Breadcrumbs backHref>`, varianta `compact`), jinde samostatně.
 */
export function BackButton({
  href,
  label = "Zpět",
  compact = false,
  className,
}: {
  href: string;
  label?: string;
  /** Menší varianta do řádku drobečkové navigace. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "icon"}
      nativeButton={false}
      className={className}
      render={<Link href={href} aria-label={label} title={label} />}
    >
      <ArrowLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
    </Button>
  );
}
