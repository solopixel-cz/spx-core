"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { taskFormSchema, type TaskFormData } from "@/lib/schemas/task";

interface TaskRow {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  assigneeUid: string;
  dueAt: string | null;
  status: string;
  createdAt: string | null;
}

interface UserOption { id: string; displayName: string }
interface ClientOption { id: string; name: string }

export function TasksPageClient({
  tasks,
  users,
  clients,
  currentUid,
}: {
  tasks: TaskRow[];
  users: UserOption[];
  clients: ClientOption[];
  currentUid: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const filtered = filter === "mine"
    ? tasks.filter((t) => t.assigneeUid === currentUid)
    : tasks;

  const now = new Date();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskFormSchema) as any,
    defaultValues: { status: "open", assigneeUid: currentUid },
  });

  async function onSubmit(data: TaskFormData) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Úkol vytvořen");
      setDialogOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se vytvořit úkol");
    }
  }

  async function toggleStatus(taskId: string, current: string) {
    const newStatus = current === "open" ? "done" : "open";
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se změnit stav");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Úkoly</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="mr-2 h-4 w-4" />Nový úkol</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Nový úkol</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Titul *</Label>
                <Input id="taskTitle" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDesc">Popis</Label>
                <Input id="taskDesc" {...register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select onValueChange={(val) => { if (val) setValue("clientId", String(val)); }}>
                    <SelectTrigger><SelectValue placeholder="Volitelné" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Řešitel *</Label>
                  <Select defaultValue={currentUid} onValueChange={(val) => { if (val) setValue("assigneeUid", String(val)); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDue">Termín</Label>
                <Input id="taskDue" type="date" {...register("dueAt")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Vytvářím..." : "Vytvořit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={filter === "mine" ? "default" : "outline"} size="sm" onClick={() => setFilter("mine")}>
          Moje
        </Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Všechny
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">Žádné úkoly</p>
        ) : (
          filtered.map((task) => {
            const isOverdue = task.status === "open" && task.dueAt && new Date(task.dueAt) < now;
            const assignee = users.find((u) => u.id === task.assigneeUid);
            const client = clients.find((c) => c.id === task.clientId);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggleStatus(task.id, task.status)}
                  className="h-4 w-4 rounded border-input"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {client && <Badge variant="outline" className="text-[10px]">{client.name}</Badge>}
                    {assignee && <span className="text-xs text-muted-foreground">{assignee.displayName}</span>}
                  </div>
                </div>
                {task.dueAt && (
                  <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {new Date(task.dueAt).toLocaleDateString("cs-CZ")}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
