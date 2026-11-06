"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

/** „Doposlat neodeslaným“ v detailu kampaně (`POST /api/marketing/campaigns/[id]/resend`). */
export function CampaignResendButton({ campaignId, count }: { campaignId: string; count: number }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/resend`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (data.failed > 0) toast.warning(`Odesláno ${data.sent}, neodešlo ${data.failed}. Důvod je u příjemců.`);
      else toast.success(data.sent === 1 ? "Odeslán 1 e-mail" : `Odesláno e-mailů: ${data.sent}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Doposlání se nepodařilo");
    } finally {
      setSending(false);
    }
  }

  return (
    <Button size="sm" onClick={resend} disabled={sending} className="shrink-0">
      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Doposlat ({count})
    </Button>
  );
}
