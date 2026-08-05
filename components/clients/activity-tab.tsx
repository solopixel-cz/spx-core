"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, ArrowRightLeft, Phone, Mail, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityData {
  id: string;
  kind: string;
  text: string;
  actorUid: string;
  createdAt: string | null;
}

const kindIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  status_change: <ArrowRightLeft className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  system: <Bot className="h-4 w-4" />,
};

const kindLabels: Record<string, string> = {
  note: "Poznámka",
  status_change: "Změna stavu",
  call: "Hovor",
  email: "E-mail",
  system: "Systém",
};

export function ActivityTab({
  entityType,
  entityId,
  activities,
  loading = false,
}: {
  entityType: string;
  entityId: string;
  activities: ActivityData[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSending(true);

    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, text: noteText.trim() }),
      });

      if (!res.ok) throw new Error();
      setNoteText("");
      toast.success("Poznámka přidána");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se přidat poznámku");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Aktivita</h3>

      {/* Add note */}
      <div className="flex gap-2">
        <Input
          placeholder="Přidat poznámku..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleAddNote}
          disabled={sending || !noteText.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-muted-foreground">Žádná aktivita</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="mt-0.5 text-muted-foreground">
                {kindIcons[activity.kind] ?? kindIcons.system}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{activity.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {kindLabels[activity.kind] ?? activity.kind}
                  </Badge>
                  {activity.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString("cs-CZ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
