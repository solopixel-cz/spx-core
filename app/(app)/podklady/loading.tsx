import { Skeleton } from "@/components/ui/skeleton";

export default function PodkladyLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
