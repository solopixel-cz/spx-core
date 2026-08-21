import { Skeleton } from "@/components/ui/skeleton";

export default function NastaveniLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
