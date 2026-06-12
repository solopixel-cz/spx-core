"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stageLabels: Record<string, string> = {
  new: "Nový",
  contacted: "Osloven",
  demo: "Demo",
  offer: "Nabídka",
  contract: "Smlouva",
  onboarding: "Onboarding",
  won: "Vyhráno",
  lost: "Ztraceno",
};

const priorityLabels: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

interface MyTask {
  id: string;
  title: string;
  dueAt: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
}

export function DashboardClient({
  leadsByStage,
  overdueInvoiceCount,
  overdueInvoiceSum,
  ticketsByPriority,
  openTicketCount,
  myTasks,
  newSubmissionsCount,
}: {
  leadsByStage: Record<string, number>;
  overdueInvoiceCount: number;
  overdueInvoiceSum: number;
  ticketsByPriority: Record<string, number>;
  openTicketCount: number;
  myTasks: MyTask[];
  newSubmissionsCount: number;
}) {
  const todayTasks = myTasks.filter((t) => t.isDueToday || t.isOverdue);
  const overdueTasks = myTasks.filter((t) => t.isOverdue);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Lead funnel */}
        <Link href="/leady">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline leadů
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {["new", "contacted", "demo", "offer", "contract", "onboarding"].map((stage) => (
                  <div key={stage} className="flex justify-between text-sm">
                    <span>{stageLabels[stage]}</span>
                    <span className="font-medium">{leadsByStage[stage] || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Overdue invoices */}
        <Link href="/fakturace">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faktury po splatnosti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {overdueInvoiceCount}
              </p>
              <p className="text-sm text-muted-foreground">
                {overdueInvoiceSum.toLocaleString("cs-CZ")} Kč
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Open tickets */}
        <Link href="/tickety">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Otevřené tickety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{openTicketCount}</p>
              <div className="mt-1 flex gap-1">
                {Object.entries(ticketsByPriority).map(([p, count]) => (
                  <Badge key={p} variant="outline" className="text-[10px]">
                    {priorityLabels[p]}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* My tasks */}
        <Link href="/ukoly">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Moje úkoly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{myTasks.length}</p>
              <div className="mt-1 text-sm text-muted-foreground">
                {todayTasks.length > 0 && <span>{todayTasks.length} dnes</span>}
                {overdueTasks.length > 0 && (
                  <span className="text-destructive ml-2">
                    {overdueTasks.length} po termínu
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* New submissions */}
        <Link href="/podklady">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nevyřízené podklady
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${newSubmissionsCount > 0 ? "text-orange-500" : ""}`}>
                {newSubmissionsCount}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's tasks */}
      {todayTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dnešní a zpožděné úkoly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between rounded-md border p-2 ${
                    task.isOverdue ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <span className="text-sm">{task.title}</span>
                  {task.dueAt && (
                    <span
                      className={`text-xs ${
                        task.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(task.dueAt).toLocaleDateString("cs-CZ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
