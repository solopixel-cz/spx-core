"use client";

import { subscriptionLabel } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Plus, Repeat } from "lucide-react";
import {
  EntityCard,
  EntityCardList,
  EntityCardEmpty,
} from "@/components/entity-card";
import { SortableHead } from "@/components/sortable-head";
import { useTableSort } from "@/lib/use-table-sort";
import {
  InvoiceActions,
  InvoiceDueCell,
  InvoiceStatusCell,
  formatAmount,
  formatInvoiceDate,
  invoiceStatusLabels,
  overdueRowClass,
} from "@/components/invoices/invoice-ui";

interface InvoiceData {
  id: string;
  number: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
}

interface SubInfo {
  id: string;
  service?: string | null;
  plan?: string | null;
  label?: string | null;
  status: string;
  internal?: boolean;
}

export function ClientInvoicesTab({
  invoices,
  clientId,
  subscriptions = [],
}: {
  invoices: InvoiceData[];
  clientId: string;
  subscriptions?: SubInfo[];
}) {
  // Fakturovat jde jen běžící, neinterní předplatné — každé má vlastní tlačítko.
  const billable = subscriptions.filter((s) => !s.internal && s.status !== "cancelled");

  // Řazení tabulky (výchozí: od posledně vystavené faktury)
  const { sorted, sort, toggle } = useTableSort(
    invoices,
    {
      number: (inv) => inv.number,
      amount: (inv) => inv.amount,
      issuedAt: (inv) => (inv.issuedAt ? new Date(inv.issuedAt) : null),
      dueAt: (inv) => (inv.dueAt ? new Date(inv.dueAt) : null),
      status: (inv) => invoiceStatusLabels[inv.status] ?? inv.status,
    },
    { key: "issuedAt", dir: "desc" },
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        nativeButton={false}
        render={<Link href={`/invoices/new?clientId=${clientId}`} />}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Vystavit fakturu
      </Button>
      {billable.map((s) => (
        <Button
          key={s.id}
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/invoices/new?clientId=${clientId}&sub=${s.id}`} />}
        >
          <Repeat className="mr-1.5 h-4 w-4" />
          {billable.length > 1 ? `Z předplatného: ${subscriptionLabel(s)}` : "Z předplatného"}
        </Button>
      ))}
    </div>
  );

  if (invoices.length === 0) {
    return (
      <div className="space-y-3">
        {actions}
        <EntityCardEmpty>Žádné faktury</EntityCardEmpty>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="number" sort={sort} onSort={toggle}>Číslo</SortableHead>
              <SortableHead sortKey="amount" sort={sort} onSort={toggle} className="text-right">Částka</SortableHead>
              <SortableHead sortKey="issuedAt" sort={sort} onSort={toggle}>Vystaveno</SortableHead>
              <SortableHead sortKey="dueAt" sort={sort} onSort={toggle}>Splatnost</SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle}>Stav</SortableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((inv) => (
              <TableRow key={inv.id} href={`/invoices/${inv.id}`} className={overdueRowClass(inv.status)}>
                <TableCell className="font-mono">{inv.number}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatAmount(inv.amount)}</TableCell>
                <TableCell className="tabular-nums">{formatInvoiceDate(inv.issuedAt)}</TableCell>
                <TableCell>
                  <InvoiceDueCell dueAt={inv.dueAt} status={inv.status} />
                </TableCell>
                <TableCell>
                  <InvoiceStatusCell status={inv.status} />
                </TableCell>
                <TableCell>
                  <InvoiceActions invoice={inv} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EntityCardList>
        {sorted.map((inv) => (
          <EntityCard
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className={inv.status === "overdue" ? "border-l-4 border-l-destructive" : undefined}
            title={<span className="font-mono">{inv.number}</span>}
            badge={<span className="font-semibold tabular-nums">{formatAmount(inv.amount)}</span>}
            subtitle={`Vystaveno ${formatInvoiceDate(inv.issuedAt)}`}
          >
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="space-y-2 text-sm">
                <InvoiceStatusCell status={inv.status} />
                <InvoiceDueCell dueAt={inv.dueAt} status={inv.status} />
              </div>
              <InvoiceActions invoice={inv} className="relative z-10" />
            </div>
          </EntityCard>
        ))}
      </EntityCardList>
    </div>
  );
}
