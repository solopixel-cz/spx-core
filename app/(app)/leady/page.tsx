import { Skeleton } from "@/components/ui/skeleton";

export default function LeadyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leady</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
