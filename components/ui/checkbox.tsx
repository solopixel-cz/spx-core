"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

interface CheckboxProps {
  checked?: boolean;
  /** Mezistav (část položek vybraná) — např. „vybrat vše" v hlavičce tabulky. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, indeterminate = false, onCheckedChange, className, disabled, ...props }, ref) => {
    const on = checked || indeterminate;
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          on && "bg-primary text-primary-foreground",
          className
        )}
        {...props}
      >
        {indeterminate ? <Minus className="h-3 w-3" /> : checked && <Check className="h-3 w-3" />}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
