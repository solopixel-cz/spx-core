import { cn } from "@/lib/utils";

// Hodnoty se inlinují při buildu (viz next.config.ts → env).
const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const sha = process.env.NEXT_PUBLIC_GIT_SHA;
const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE;

/** Verze aplikace + build info — patička menu, úplně dole. */
export function AppVersion({ className }: { className?: string }) {
  const buildInfo = [sha, buildDate].filter(Boolean).join(" · ");
  return (
    <div
      className={cn(
        "px-3 py-3 text-[11px] leading-tight text-sidebar-foreground/40",
        className
      )}
    >
      <p className="font-medium">v{version}</p>
      {buildInfo && <p className="tabular-nums">{buildInfo}</p>}
    </div>
  );
}
