"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserPlus } from "lucide-react";
import { renderHubInviteEmail } from "@/lib/email-templates/hub-invite";

interface HubInviteFormProps {
  clientId: string;
  clientName: string;
  /** Výchozí oslovení (lze upravit). */
  defaultGreeting?: string;
  clientEmail: string;
  /** Odkaz do hubu pro náhled (počítá server z HUB_URL). */
  odkaz: string;
  /** ISO datum poslední pozvánky, pokud už byla poslána. */
  invitedAt: string | null;
  backHref: string;
}

/**
 * Pozvánka do klientské zóny (spx-hub) jako routa `/clients/[id]/send/hub`:
 * oslovení, náhled e-mailu a odeslání. Opakované odeslání se potvrzuje
 * přímo na tlačítku.
 */
export function HubInviteForm({
  clientId,
  clientName,
  defaultGreeting,
  clientEmail,
  odkaz,
  invitedAt,
  backHref,
}: HubInviteFormProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState(defaultGreeting ?? clientName.split(" ")[0]);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(!invitedAt);
  const inFlight = useRef(false);

  async function handleSend() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    if (inFlight.current) return; // pojistka proti dvojkliku
    inFlight.current = true;
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hub_invite", greeting: greeting.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }

      toast.success("Pozvánka do klientské zóny odeslána");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat e-mail");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      {invitedAt && !confirmed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Pozvánka už byla poslána {new Date(invitedAt).toLocaleDateString("cs-CZ")}.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Opravdu chcete poslat znovu?
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Oslovení (5. pád)</Label>
        <Input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Např. Jane, Honzo..."
        />
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Náhled e-mailu</p>
        <div className="rounded border overflow-hidden bg-[#F1F5F9]">
          <iframe
            srcDoc={
              renderHubInviteEmail({
                jmeno: greeting || clientName.split(" ")[0],
                odkaz,
              }).html
            }
            sandbox=""
            className="w-full border-0"
            style={{ height: "520px" }}
            title="Náhled e-mailu"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>
          Příjemce: <span className="font-medium">{clientEmail}</span>
        </p>
        <p>Klient se přihlašuje tímto e-mailem — bez hesla, odkazem z e-mailu.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSend} disabled={sending || !greeting.trim()}>
          <UserPlus className="mr-2 h-4 w-4" />
          {sending
            ? "Odesílám..."
            : !confirmed
              ? "Ano, poslat znovu"
              : "Poslat pozvánku"}
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          disabled={sending}
          render={<Link href={backHref} />}
        >
          Zrušit
        </Button>
      </div>
    </div>
  );
}
