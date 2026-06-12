import { cn } from "@/lib/utils";
import { type statusColorClasses, getStatusClasses, getStatusLabel } from "@/lib/status";

interface StatusBadgeProps {
  map: Record<string, { label: string; color: keyof typeof statusColorClasses }>;
  value: string;
  className?: string;
}

export function StatusBadge({ map, value, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        getStatusClasses(map, value),
        className
      )}
    >
      {getStatusLabel(map, value)}
    </span>
  );
}
