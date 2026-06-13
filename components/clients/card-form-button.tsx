"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy, Send } from "lucide-react";

const FORM_BASE_URL =
  process.env.NEXT_PUBLIC_CARD_FORM_BASE_URL ??
  "https://www.solopixel.cz/cs/vizitka-formular?token=";

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
      const { token } = await res.json();
      setUrl(`${FORM_BASE_URL}${token}`);
      setExistingToken(token);
      setDialogOpen(true);
    } catch {
      toast.error("Nepodařilo se vygenerovat odkaz");
    } finally {
      setLoading(false);
    }
  }

  function handleShowExisting() {
    if (existingToken) {
      setUrl(`${FORM_BASE_URL}${existingToken}`);
      setDialogOpen(true);
    }
  }

  function handleCopy() {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Odkaz zkopírován");
    }
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
            onClick={handleGenerate}
            disabled={loading}
          >
            <Send className="mr-2 h-3 w-3" />
            {loading ? "Generuji..." : "Poslat formulář podkladů"}
          </Button>
        )}
        {existingToken && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "..." : "Nový odkaz"}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odkaz na formulář podkladů</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pošlete tento odkaz klientovi {clientName}:
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
