"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { promoFormUrl } from "@/lib/promo-url";

// Tisk: QR černý na bílém s okrajem (quiet zone), korekce M snese drobné poškození letáku.
const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } } as const;

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

/** QR kód s odkazem na formulář /kontakt s předvyplněným promo kódem. */
export function PromoQrDialog({ code, onClose }: { code: string | null; onClose: () => void }) {
  const [qr, setQr] = useState<{ code: string; svg: string; png: string } | null>(null);
  const url = code ? promoFormUrl(code) : "";

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const link = promoFormUrl(code);
    Promise.all([
      QRCode.toString(link, { ...QR_OPTIONS, type: "svg" }),
      QRCode.toDataURL(link, { ...QR_OPTIONS, width: 1024 }),
    ]).then(([svg, png]) => {
      if (!cancelled) setQr({ code, svg, png });
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const ready = qr && qr.code === code ? qr : null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz zkopírován");
    } catch {
      toast.error("Odkaz se nepodařilo zkopírovat");
    }
  }

  return (
    <Dialog open={code != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR kód pro {code}</DialogTitle>
          <DialogDescription>
            Po naskenování se otevře formulář na webu s předvyplněným kódem. SVG je pro tisk, PNG pro
            online použití.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col items-center gap-3">
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ready.png}
              alt={`QR kód s promo kódem ${code}`}
              className="aspect-square w-full max-w-64 rounded-lg ring-1 ring-border"
            />
          ) : (
            <Skeleton className="aspect-square w-full max-w-64 rounded-lg" />
          )}
          <div className="flex w-full items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={url}>
              {url}
            </span>
            <Button size="sm" variant="ghost" aria-label="Kopírovat odkaz" title="Kopírovat odkaz" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Otevřít odkaz"
              title="Otevřít odkaz"
              nativeButton={false}
              render={<a href={url} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={!ready}
            onClick={() =>
              ready &&
              download(
                URL.createObjectURL(new Blob([ready.svg], { type: "image/svg+xml" })),
                `qr-promo-${ready.code}.svg`,
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            SVG
          </Button>
          <Button disabled={!ready} onClick={() => ready && download(ready.png, `qr-promo-${ready.code}.png`)}>
            <Download className="mr-2 h-4 w-4" />
            PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
