"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function InvoiceExportDialog() {
  const now = new Date();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export faktur pro účetní</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            CSV se seznamem faktur za zvolené období (dle data vystavení).
            Otevře se v Excelu s diakritikou.
          </p>

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

          <div className="grid grid-cols-2 gap-4">
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
        <DialogFooter>
          <Button onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            Stáhnout CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
