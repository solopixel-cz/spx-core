import { Skeleton } from "@/components/ui/skeleton";

export default function WebFeedbackLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
