"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * Prvky uvnitř řádku, na které klik NESMÍ spustit navigaci řádku
 * (tlačítka, odkazy, formulářová pole, checkboxy, menu). Díky tomu není
 * potřeba ruční `stopPropagation` na vnořených akcích.
 */
const ROW_INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="checkbox"], [role="menuitem"], [role="menu"], [data-no-row-nav]'

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-[0.9375rem]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({
  className,
  href,
  onRowClick,
  onClick,
  ...props
}: React.ComponentProps<"tr"> & {
  /** Když je vyplněné, klik na řádek přejde na tuto interní cestu (detail). */
  href?: string
  /** Alternativa k href — vlastní akce na klik řádku (např. otevření detailu v Sheetu). */
  onRowClick?: () => void
}) {
  const router = useRouter()
  const clickable = !!href || !!onRowClick

  function activate(target: EventTarget | null) {
    // Klik na vnořený interaktivní prvek řeší on sám — řádek neaktivujeme.
    if (target instanceof Element && target.closest(ROW_INTERACTIVE_SELECTOR)) return
    // Když uživatel označuje text v řádku, nenavigujeme.
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return
    if (onRowClick) onRowClick()
    else if (href) router.push(href)
  }

  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        clickable && "cursor-pointer",
        className
      )}
      onClick={(e) => {
        onClick?.(e)
        if (clickable && !e.defaultPrevented) activate(e.target)
      }}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-3 text-left align-middle text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
