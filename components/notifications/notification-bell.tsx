"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks/use-collection";
import type { NotificationDoc } from "@/lib/schemas/notification";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(ts: Timestamp | null): string {
  if (!ts?.toDate) return "";
  const diff = Date.now() - ts.toDate().getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `před ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `před ${days} dny`;
}

export function NotificationBell({ uid }: { uid: string }) {
  const router = useRouter();

  const q = useMemo(() => {
    if (!uid) return null;
    return query(
      collection(getClientFirestore(), "notifications"),
      where("recipientUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [uid]);

  const { data } = useCollection<NotificationDoc>(q);
  const unread = data.filter((n) => !n.readAt);

  // Toast při příchodu nové notifikace (ne při prvním načtení).
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(data.map((n) => n.id));
      return;
    }
    for (const n of data) {
      if (!seenRef.current.has(n.id)) {
        seenRef.current.add(n.id);
        if (!n.readAt) {
          toast(n.title, {
            description: n.body,
            action: {
              label: "Otevřít",
              onClick: () => router.push(n.href),
            },
          });
        }
      }
    }
  }, [data, router]);

  async function markRead(n: NotificationDoc) {
    if (n.readAt) return;
    try {
      await updateDoc(doc(getClientFirestore(), "notifications", n.id), {
        readAt: serverTimestamp(),
      });
    } catch {
      // tichá chyba — nekritické
    }
  }

  async function markAllRead() {
    await Promise.all(unread.map((n) => markRead(n)));
  }

  function openNotification(n: NotificationDoc) {
    markRead(n);
    router.push(n.href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifikace"
          />
        }
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifikace</span>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Označit vše
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Zatím žádné notifikace
            </p>
          ) : (
            data.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
              >
                <div className="flex w-full items-start gap-2">
                  {!n.readAt && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={n.readAt ? "pl-4" : ""}>
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                </div>
                <span className="pl-4 text-[11px] text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
