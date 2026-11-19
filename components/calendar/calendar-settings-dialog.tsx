"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Osobní nastavení kalendáře: ranní souhrn e-mailem a soukromý odkaz pro
 * odběr v Google Kalendáři. Každý uživatel má své.
 */
export function CalendarSettingsDialog({
  open,
  onOpenChange,
  feedToken,
  digestEmail,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedToken: string | null;
  digestEmail: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"digest" | "feed" | "delete" | null>(null);
  const [digest, setDigest] = useState(digestEmail);
  const feedUrl = feedToken && typeof window !== "undefined" ? `${window.location.origin}/api/calendar/ics/${feedToken}` : null;

  async function call(kind: "digest" | "feed" | "delete", init: RequestInit) {
    setBusy(kind);
    try {
      const res = await fetch("/api/calendar/settings", { headers: { "Content-Type": "application/json" }, ...init });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Nepodařilo se uložit");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function toggleDigest(value: boolean) {
    setDigest(value);
    const ok = await call("digest", { method: "PATCH", body: JSON.stringify({ digestEmail: value }) });
    if (!ok) setDigest(!value);
    else toast.success(value ? "Ranní souhrn bude chodit e-mailem" : "Ranní souhrn e-mailem vypnut");
  }

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success("Odkaz zkopírován");
    } catch {
      toast.error("Kopírování se nepovedlo, označte odkaz ručně");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Google Kalendář a ranní souhrn</DialogTitle>
          <DialogDescription>Nastavení platí jen pro vás.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Ranní souhrn</h3>
          <p className="text-sm text-muted-foreground">
            Každé ráno kolem 6:00 (v létě 7:00) přijde přehled: co je po termínu, co je dnes a co přijde do týdne. V CRM a na zařízení s
            povolenými notifikacemi vždy, když je co dělat.
          </p>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox checked={digest} disabled={busy === "digest"} onCheckedChange={toggleDigest} aria-label="Posílat ranní souhrn e-mailem" />
            Posílat i e-mailem{email && <span className="text-muted-foreground">na {email}</span>}
          </label>
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Odběr v Google Kalendáři</h3>
          {feedUrl ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Soukromý odkaz na kalendář" className="font-mono text-xs" />
                <Button variant="outline" size="icon-sm" onClick={copy} aria-label="Zkopírovat odkaz">
                  <Copy />
                </Button>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  V Google Kalendáři vlevo u „Další kalendáře“ klikněte na <strong className="text-foreground">+</strong> a{" "}
                  <strong className="text-foreground">Přidat podle adresy URL</strong>.
                </li>
                <li>Vložte odkaz a potvrďte. Kalendář se objeví jako „SoloPixel CRM“.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Google odběr obnovuje sám, obvykle několikrát denně, takže změny z CRM se v něm neukážou hned. Odkaz je soukromý, kdo ho má, vidí
                události CRM. Když unikne, vytvořte nový, starý přestane fungovat.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => call("feed", { method: "POST" })}>
                  {busy === "feed" && <Loader2 className="animate-spin" />}
                  Vytvořit nový odkaz
                </Button>
                <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => call("delete", { method: "DELETE" })}>
                  {busy === "delete" && <Loader2 className="animate-spin" />}
                  Zrušit odběr
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Události CRM (fakturace, splatnosti, domény…) uvidíte v Google Kalendáři i v telefonu. Vytvoří se soukromý odkaz, který do
                Google Kalendáře přidáte jako odběr.
              </p>
              <Button size="sm" disabled={busy !== null} onClick={() => call("feed", { method: "POST" })}>
                {busy === "feed" && <Loader2 className="animate-spin" />}
                Vytvořit odkaz
              </Button>
            </>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
