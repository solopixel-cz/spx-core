"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UnsubscribeClient({
  token,
  email,
  alreadyUnsubscribed,
}: {
  token: string;
  email: string;
  alreadyUnsubscribed: boolean;
}) {
  const [done, setDone] = useState(alreadyUnsubscribed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Odhlášení se nepodařilo. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="text-xl font-bold">Odhlášeno</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Adresa <span className="font-medium">{email}</span> už nebude dostávat
          marketingové e-maily.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold">Odhlásit odběr</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Opravdu chcete odhlásit <span className="font-medium">{email}</span> z
        marketingových e-mailů?
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button onClick={handleUnsubscribe} disabled={loading} className="mt-5 w-full">
        {loading ? "Odhlašuji..." : "Odhlásit odběr"}
      </Button>
    </>
  );
}
