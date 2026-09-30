"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Export faktur pro účetní (CSV za období) jako routa `/invoices/export`. */
export function InvoiceExport() {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), 0, 1)));
  const [to, setTo] = useState(iso(now));

  function preset(kind: "month" | "year" | "all") {
    if (kind === "month") {
      setFrom(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(iso(now));
    } else if (kind === "year") {
      setFrom(iso(new Date(now.getFullYear(), 0, 1)));
      setTo(iso(now));
    } else {
      setFrom("");
      setTo("");
    }
  }

  function download() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    window.location.href = `/api/invoices/export${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => preset("month")}>
            Tento měsíc
          </Button>
          <Button variant="secondary" size="sm" onClick={() => preset("year")}>
            Tento rok
          </Button>
          <Button variant="secondary" size="sm" onClick={() => preset("all")}>
            Vše
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="export-from">Od</Label>
            <Input
              id="export-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-to">Do</Label>
            <Input
              id="export-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download}>
          <Download className="mr-2 h-4 w-4" />
          Stáhnout CSV
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/invoices" />}
        >
          Zpět na faktury
        </Button>
      </div>
    </div>
  );
}
