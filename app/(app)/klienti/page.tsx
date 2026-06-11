import { Skeleton } from "@/components/ui/skeleton";

export default function KlientiPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Klienti</h1>
      <Skeleton className="h-10 w-64 rounded-md" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
