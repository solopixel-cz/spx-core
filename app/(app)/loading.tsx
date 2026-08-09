import { PixelLogo } from "@/components/pixel-logo";

/** Init obrazovka aplikace — rotující pixel logo. */
export default function AppLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <PixelLogo spin className="size-12 text-foreground" />
      <p className="font-heading text-sm font-medium text-muted-foreground">
        SPX Core
      </p>
    </div>
  );
}
