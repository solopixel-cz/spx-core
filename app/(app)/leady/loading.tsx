import { Skeleton } from "@/components/ui/skeleton";

export default function LeadyLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
