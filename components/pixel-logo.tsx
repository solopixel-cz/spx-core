import { cn } from "@/lib/utils";

/**
 * Pixel symbol z loga SoloPixel — 3×3 mřížka s prázdným středem,
 * pravý horní čtverec mint (#5eead4). Osm čtverců dědí barvu přes
 * `currentColor`, takže se přizpůsobí světlému i tmavému režimu.
 */
export function PixelLogo({
  className,
  spin = false,
}: {
  className?: string;
  spin?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 30 30"
      aria-hidden="true"
      className={cn(spin && "animate-[spin_1.6s_linear_infinite]", className)}
    >
      <rect x="0" y="0" width="10" height="10" fill="currentColor" />
      <rect x="10" y="0" width="10" height="10" fill="currentColor" />
      <rect x="20" y="0" width="10" height="10" fill="#5eead4" />
      <rect x="0" y="10" width="10" height="10" fill="currentColor" />
      <rect x="20" y="10" width="10" height="10" fill="currentColor" />
      <rect x="0" y="20" width="10" height="10" fill="currentColor" />
      <rect x="10" y="20" width="10" height="10" fill="currentColor" />
      <rect x="20" y="20" width="10" height="10" fill="currentColor" />
    </svg>
  );
}
