"use client";

import { useState, useMemo } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Repeat, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  taskFormSchema,
  taskRecurrenceLabels,
  TASK_RECURRENCES,
  type TaskFormData,
} from "@/lib/schemas/task";

interface TaskRow {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  assigneeUid: string;
  dueAt: string | null;
  status: string;
  recurrence?: string;
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
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const localTasks = useMemo(() =>
    tasks
      .filter((t) => !deletedIds.has(t.id))
      .map((t) => optimisticOverrides[t.id] ? { ...t, status: optimisticOverrides[t.id] } : t),
    [tasks, optimisticOverrides, deletedIds]
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const filtered = filter === "mine"
    ? localTasks.filter((t) => t.assigneeUid === currentUid)
    : localTasks;

  const now = new Date();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskFormSchema) as any,
    defaultValues: { status: "open", assigneeUid: currentUid, recurrence: "none" },
  });

  const clientItems = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.name])),
    [clients]
  );
  const userItems = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.displayName])),
    [users]
  );

  function openCreate() {
    setEditingTask(null);
    reset({ status: "open", assigneeUid: currentUid, recurrence: "none", title: "", description: "", clientId: undefined, dueAt: "" });
    setDialogOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description ?? "",
      clientId: task.clientId,
      assigneeUid: task.assigneeUid,
      dueAt: task.dueAt ? task.dueAt.split("T")[0] : "",
      recurrence: (task.recurrence as TaskFormData["recurrence"]) ?? "none",
      status: task.status as TaskFormData["status"],
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: TaskFormData) {
    try {
      const res = await fetch(
        editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks",
        {
          method: editingTask ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(editingTask ? "Úkol upraven" : "Úkol vytvořen");
      setDialogOpen(false);
      setEditingTask(null);
      reset();
      router.refresh();
    } catch {
      toast.error(editingTask ? "Nepodařilo se upravit úkol" : "Nepodařilo se vytvořit úkol");
    }
  }

  async function handleDelete(task: TaskRow) {
    if (!window.confirm(`Smazat úkol „${task.title}"? Tuto akci nelze vzít zpět.`)) return;
    setDeletedIds((prev) => new Set(prev).add(task.id));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Úkol smazán");
      router.refresh();
    } catch {
      setDeletedIds((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
      toast.error("Nepodařilo se smazat úkol");
    }
  }

  async function toggleStatus(taskId: string, current: string) {
    const newStatus = current === "open" ? "done" : "open";
    // Optimistic update
    setOptimisticOverrides((prev) => ({ ...prev, [taskId]: newStatus }));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setOptimisticOverrides((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
      router.refresh();
    } catch {
      // Revert optimistic update
      setOptimisticOverrides((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
      toast.error("Nepodařilo se změnit stav");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Úkoly</h1>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nový úkol</Button>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingTask(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingTask ? "Upravit úkol" : "Nový úkol"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Titul *</Label>
                <div className="flex gap-2">
                  <Input id="taskTitle" className="flex-1" {...register("title")} />
                  <EmojiPicker
                    onSelect={(e) =>
                      setValue("title", (getValues("title") ?? "") + e, { shouldDirty: true })
                    }
                  />
                </div>
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDesc">Popis</Label>
                <Input id="taskDesc" {...register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select items={clientItems} value={watch("clientId")} onValueChange={(val) => { if (val) setValue("clientId", String(val)); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Volitelné" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Řešitel *</Label>
                  <Select items={userItems} value={watch("assigneeUid")} onValueChange={(val) => { if (val) setValue("assigneeUid", String(val)); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskDue">Termín</Label>
                  <Input id="taskDue" type="date" {...register("dueAt")} />
                </div>
                <div className="space-y-2">
                  <Label>Opakování</Label>
                  <Select items={taskRecurrenceLabels} value={watch("recurrence") ?? "none"} onValueChange={(val) => { if (val) setValue("recurrence", val as TaskFormData["recurrence"]); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_RECURRENCES.map((r) => (
                        <SelectItem key={r} value={r}>{taskRecurrenceLabels[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ukládám..." : editingTask ? "Uložit" : "Vytvořit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "mine" | "all")}>
        <TabsList className="sm:min-w-56">
          <TabsTrigger value="mine">Moje</TabsTrigger>
          <TabsTrigger value="all">Všechny</TabsTrigger>
        </TabsList>
      </Tabs>

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
                className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggleStatus(task.id, task.status)}
                  disabled={optimisticOverrides[task.id] !== undefined}
                  className="h-4 w-4 rounded border-input disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {client && <Badge variant="outline" className="text-[10px]">{client.name}</Badge>}
                    {task.recurrence && task.recurrence !== "none" && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Repeat className="h-3 w-3" />
                        {taskRecurrenceLabels[task.recurrence as keyof typeof taskRecurrenceLabels] ?? task.recurrence}
                      </Badge>
                    )}
                    {assignee && <span className="text-xs text-muted-foreground">{assignee.displayName}</span>}
                  </div>
                </div>
                {task.dueAt && (
                  <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {new Date(task.dueAt).toLocaleDateString("cs-CZ")}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Akce">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openEdit(task)}>
                      <Pencil className="h-4 w-4" /> Upravit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(task)}>
                      <Trash2 className="h-4 w-4" /> Smazat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
