"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface InvoiceData {
  id: string;
  number: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
}

const statusLabels: Record<string, string> = {
  draft: "Koncept",
  sent: "Odesláno",
  paid: "Zaplaceno",
  overdue: "Po splatnosti",
  cancelled: "Stornováno",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
};

export function ClientInvoicesTab({ invoices }: { invoices: InvoiceData[] }) {
  const router = useRouter();

  async function handleAction(invoiceId: string, action: "paid" | "cancelled") {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "paid" ? "Faktura zaplacena" : "Faktura stornována");
      router.refresh();
    } catch {
      toast.error("Akce se nezdařila");
    }
  }

  if (invoices.length === 0) {
    return <p className="text-muted-foreground">Žádné faktury</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Číslo</TableHead>
            <TableHead>Částka</TableHead>
            <TableHead>Vystaveno</TableHead>
            <TableHead>Splatnost</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead className="w-24">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono">{inv.number}</TableCell>
              <TableCell>{inv.amount.toLocaleString("cs-CZ")} Kč</TableCell>
              <TableCell>
                {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("cs-CZ") : "—"}
              </TableCell>
              <TableCell>
                {inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("cs-CZ") : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariants[inv.status] ?? "secondary"}>
                  {statusLabels[inv.status] ?? inv.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {(inv.status === "sent" || inv.status === "overdue") && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleAction(inv.id, "paid")} title="Zaplaceno">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleAction(inv.id, "cancelled")} title="Stornovat">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
