import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Jednotné tlačítko „zpět" — ghost ikona se šipkou, která vede na nadřazenou
 * stránku (`href`). Používá se na všech detailech a pod-stránkách napříč appkou.
 */
export function BackButton({
  href,
  label = "Zpět",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      className={className}
      render={<Link href={href} aria-label={label} title={label} />}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
