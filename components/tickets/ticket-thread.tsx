"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TicketFile } from "@/lib/schemas/ticket";
import type { TicketMessage } from "@/lib/ticket-route";

/** Přílohy z HUBu: obrázky jako náhledy, PDF jako odkaz. */
export function TicketFiles({ files }: { files: TicketFile[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {files.map((f) => (
        <li key={f.path}>
          <a href={f.url} target="_blank" rel="noopener noreferrer" title={f.name} className="block">
            {f.type.startsWith("image/") && f.type !== "image/heic" ? (
              // eslint-disable-next-line @next/next/no-img-element -- soubor ze Storage s tokenem, mimo next/image
              <img src={f.url} alt={f.name} className="h-20 w-20 rounded-lg border object-cover hover:opacity-90" />
            ) : (
              <span className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="w-full truncate text-center">{f.name}</span>
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Vlákno ticketu z HUBu: zprávy klienta a týmu, pod nimi odpověď.
 * Odpověď uvidí klient v HUBu, e-mailem (od vás) jen se zaškrtnutím.
 */
export function TicketThread({
  ticketId,
  messages,
  clientEmail,
  disabled,
}: {
  ticketId: string;
  messages: TicketMessage[];
  clientEmail: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notify, setNotify] = useState(true);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, notify: notify && !!clientEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (data.email === "sent") toast.success("Odpověď odeslána i e-mailem");
      else if (data.emailError) toast.warning(`Odpověď je v HUBu, e-mail neodešel: ${data.emailError}`);
      else toast.success("Odpověď odeslána do HUBu");
      setText("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Odpověď se nepodařilo odeslat");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Komunikace s klientem</p>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatím žádné zprávy.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "rounded-2xl border p-4 text-sm",
                m.from === "team" ? "ml-6 border-primary/20 bg-primary/5 md:ml-12" : "mr-6 bg-card md:mr-12"
              )}
            >
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.authorName || (m.from === "team" ? "Tým" : "Klient")}
                  {m.from === "client" && " (klient)"}
                </span>
                <span>{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <TicketFiles files={m.attachments} />
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <form onSubmit={send} className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Odpověď klientovi…"
            aria-label="Odpověď klientovi"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {clientEmail ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={notify} onCheckedChange={setNotify} aria-label="Poslat i e-mailem" />
                Poslat i e-mailem ({clientEmail}), jinak jen do HUBu
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">Klient odpověď uvidí v HUBu.</p>
            )}
            <Button type="submit" size="sm" disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Odeslat odpověď
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
