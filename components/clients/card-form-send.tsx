"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Send, Loader2 } from "lucide-react";
import { buildCardFormUrl } from "@/lib/card-form-url";

/**
 * Formulář podkladů jako routa `/clients/[id]/send/form`. Pošle klientovi
 * e-mail s odkazem na formulář, případně ukáže už vytvořený odkaz ke
 * zkopírování nebo opětovnému odeslání.
 */
export function CardFormSend({
  clientId,
  clientName,
  clientEmail,
  backHref,
}: {
  clientId: string;
  /** Jméno osoby, které formulář vyplní (u firmy kontaktní osoba). */
  clientName: string;
  clientEmail: string;
  backHref: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [sentNow, setSentNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    fetch(`/api/card-tokens?clientId=${clientId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((tokens: Array<{ id: string; usedAt?: string }>) => {
        const unused = tokens.find((t) => !t.usedAt);
        if (unused) setUrl(buildCardFormUrl(unused.id));
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [clientId]);

  async function handleSend() {
    if (inFlight.current) return; // pojistka proti dvojkliku (i rychlému, před re-renderem)
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/card-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: clientName, email: clientEmail }),
      });
      if (!res.ok) throw new Error();
      const { token, emailSent, emailError } = (await res.json()) as {
        token: string;
        emailSent?: boolean;
        emailError?: string;
      };
      setUrl(buildCardFormUrl(token));
      setSentNow(true);
      if (emailSent) {
        toast.success(`Formulář odeslán na ${clientEmail}`);
      } else {
        toast.warning(
          emailError
            ? `Odkaz vytvořen, ale e-mail se nepodařilo odeslat: ${emailError}`
            : "Odkaz vytvořen, e-mail se nepodařilo odeslat, pošlete ho ručně"
        );
      }
    } catch {
      toast.error("Nepodařilo se vygenerovat odkaz");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (initialLoading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {url && !sentNow && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Formulář už byl tomuto klientovi odeslán.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Odkaz můžete zkopírovat a poslat ručně. Opětovné odeslání vytvoří nový
            odkaz a pošle další e-mail.
          </p>
        </div>
      )}

      {sentNow && (
        <p className="text-sm text-muted-foreground">
          E-mail s formulářem odešel na{" "}
          <span className="font-medium text-foreground">{clientEmail}</span>. Odkaz
          můžete poslat i ručně:
        </p>
      )}

      {!url && (
        <p className="text-sm text-muted-foreground">
          E-mail s odkazem na formulář podkladů se odešle na{" "}
          <span className="font-medium text-foreground">{clientEmail}</span>. Klient
          přes něj vyplní podklady pro vizitku.
        </p>
      )}

      {url && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Odkaz na formulář</p>
          <div className="flex gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Zkopírováno" : "Kopírovat"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {sentNow ? (
          <Button nativeButton={false} render={<Link href={backHref} />}>
            Hotovo
          </Button>
        ) : (
          <>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {loading ? "Odesílám..." : url ? "Poslat znovu" : "Odeslat formulář"}
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              disabled={loading}
              render={<Link href={backHref} />}
            >
              Zrušit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
