import { cn } from "@/lib/utils";

/**
 * Řádek filtrů nad seznamem — sjednocuje vzhled napříč stránkami:
 * pill vstupy a selecty (ladí s tlačítky a segmented taby), na mobilu
 * vyšší dotyková plocha a zalamování.
 */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3",
        // Pill vzhled vstupů a selectů uvnitř filtrů
        "[&_[data-slot=input]]:rounded-full! [&_[data-slot=input]]:px-3.5",
        "[&_[data-slot=select-trigger]]:rounded-full! [&_[data-slot=select-trigger]]:pl-3",
        // Větší dotyková plocha na mobilu
        "max-sm:[&_[data-slot=input]]:h-9! max-sm:[&_[data-slot=select-trigger]]:h-9!",
        className
      )}
    >
      {children}
    </div>
  );
}
