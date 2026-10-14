"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/use-table-sort";

/** Řaditelná hlavička sloupce. Funguje s `useTableSort` i s TanStack Table. */
export function SortButton({
  children,
  dir,
  onClick,
  className,
}: {
  children: React.ReactNode;
  /** Aktuální směr, pokud se podle tohoto sloupce řadí; jinak false. */
  dir: SortDir | false;
  onClick: () => void;
  className?: string;
}) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
        dir ? "text-foreground" : undefined,
        className,
      )}
    >
      {children}
      <Icon className={cn("h-3.5 w-3.5 shrink-0", dir ? "opacity-100" : "opacity-40")} />
    </button>
  );
}

export function SortableHead<K extends string>({
  sortKey,
  sort,
  onSort,
  children,
  className,
}: {
  sortKey: K;
  sort: { key: K; dir: SortDir };
  onSort: (key: K) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const dir = sort.key === sortKey ? sort.dir : false;
  return (
    <TableHead
      className={className}
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
    >
      <SortButton dir={dir} onClick={() => onSort(sortKey)} className={className?.includes("text-right") ? "ml-auto" : undefined}>
        {children}
      </SortButton>
    </TableHead>
  );
}
