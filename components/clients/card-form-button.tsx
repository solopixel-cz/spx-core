"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy, Send, Loader2 } from "lucide-react";
import { buildCardFormUrl } from "@/lib/card-form-url";

export function CardFormButton({
  clientId,
  clientName,
  clientEmail,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inFlight = useRef(false);

  const isResend = !!existingToken;

  useEffect(() => {
    fetch(`/api/card-tokens?clientId=${clientId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((tokens: Array<{ id: string; usedAt?: string }>) => {
        const unused = tokens.find((t) => !t.usedAt);
        if (unused) setExistingToken(unused.id);
      })
      .catch(() => {});
  }, [clientId]);

  async function handleGenerate() {
    if (inFlight.current) return; // pojistka proti dvojkliku (i rychlému, před re-renderem)
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/card-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: clientName,
          email: clientEmail,
        }),
      });
      if (!res.ok) throw new Error();
      const { token, emailSent, emailError } = (await res.json()) as {
        token: string;
        emailSent?: boolean;
        emailError?: string;
      };
      setUrl(buildCardFormUrl(token));
      setExistingToken(token);
      setConfirmOpen(false);
      setDialogOpen(true);
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

  function handleShowExisting() {
    if (existingToken) {
      setUrl(buildCardFormUrl(existingToken));
      setDialogOpen(true);
    }
  }

  function handleCopy() {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Odkaz zkopírován");
    }
  }

  function openConfirm() {
    if (loading) return;
    setConfirmOpen(true);
  }

  return (
    <>
      <div className="flex gap-2">
        {existingToken ? (
          <Button variant="outline" size="sm" onClick={handleShowExisting}>
            <Copy className="mr-2 h-3 w-3" />
            Zkopírovat odkaz na formulář
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={openConfirm}
            disabled={loading}
          >
            <Send className="mr-2 h-3 w-3" />
            Poslat formulář podkladů
          </Button>
        )}
        {existingToken && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openConfirm}
            disabled={loading}
          >
            Poslat znovu
          </Button>
        )}
      </div>

      {/* Potvrzovací modál — klik na lištové tlačítko sám o sobě nic neodešle */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !loading && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isResend ? "Poslat formulář znovu?" : "Odeslat formulář podkladů?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isResend && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Formulář už byl tomuto klientovi odeslán.
                </p>
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  Opětovné odeslání vytvoří nový odkaz a pošle další e-mail.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              E-mail s odkazem na formulář podkladů se odešle na{" "}
              <span className="font-medium text-foreground">{clientEmail}</span>.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Zrušit
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {loading ? "Odesílám..." : isResend ? "Poslat znovu" : "Odeslat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odkaz na formulář podkladů</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              E-mail s formulářem byl odeslán klientovi {clientName}. Případně
              můžete odkaz poslat i ručně:
            </p>
            <div className="flex gap-2">
              <Input value={url ?? ""} readOnly className="font-mono text-xs" />
              <Button size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
