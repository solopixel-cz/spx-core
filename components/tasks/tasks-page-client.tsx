"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Repeat,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  CircleDashed,
  CircleCheck,
  CalendarDays,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { taskRecurrenceLabels } from "@/lib/schemas/task";
import { deferredDelete } from "@/lib/undo-toast";

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
  doneAt?: string | null;
  updatedAt?: string | null;
}

interface UserOption { id: string; displayName: string }
interface ClientOption { id: string; name: string }

/** Barevná paleta pro odlišení řešitelů (klíčováno pořadím uživatele). */
const ASSIGNEE_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Pondělí aktuálního týdne (00:00). */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const mondayOffset = (x.getDay() + 6) % 7; // Po=0 … Ne=6
  x.setDate(x.getDate() - mondayOffset);
  return x;
}

/** Posune datum o jeden interval opakování (mirror serverové logiky). */
function advanceDate(date: Date, recurrence: string): void {
  switch (recurrence) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "yearly": date.setFullYear(date.getFullYear() + 1); break;
  }
}

/** Vypočte příští termín opakovaného úkolu po jeho splnění. */
function nextOccurrence(dueISO: string | null, recurrence: string): Date {
  const base = dueISO ? new Date(dueISO) : new Date();
  const next = new Date(base);
  const today = startOfDay(new Date());
  do { advanceDate(next, recurrence); } while (next < today);
  return next;
}

function isRecurring(t: TaskRow): boolean {
  return !!t.recurrence && t.recurrence !== "none";
}

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
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [doneOpen, setDoneOpen] = useState(false);

  const filtered = filter === "mine"
    ? localTasks.filter((t) => t.assigneeUid === currentUid)
    : localTasks;

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = new Date(startOfWeek(now).getTime() + 7 * DAY_MS); // pondělí příštího týdne

  // --- Rozdělení úkolů ---
  const openTasks = useMemo(() => filtered.filter((t) => t.status !== "done"), [filtered]);

  // Pravidelné (opakované) — vlastní panel, každý jen jednou.
  const recurringTasks = useMemo(
    () => openTasks
      .filter(isRecurring)
      .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")),
    [openTasks]
  );

  // Jednorázové otevřené úkoly rozdělené podle termínu.
  const oneOff = useMemo(() => openTasks.filter((t) => !isRecurring(t)), [openTasks]);

  const overdue = useMemo(
    () => oneOff
      .filter((t) => t.dueAt && new Date(t.dueAt) < todayStart)
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")),
    [oneOff, todayStart]
  );

  const backlog = useMemo(
    () => oneOff
      .filter((t) => !t.dueAt || new Date(t.dueAt) >= weekEnd)
      .sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return a.dueAt.localeCompare(b.dueAt);
      }),
    [oneOff, weekEnd]
  );

  // Boxy po dnech pro zbytek tohoto týdne (Dnes … Neděle).
  const weekDays = useMemo(() => {
    const days: { date: Date; label: string; tasks: TaskRow[] }[] = [];
    const weekTasks = oneOff.filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
      return d >= todayStart && d < weekEnd;
    });
    let cursor = new Date(todayStart);
    let idx = 0;
    while (cursor < weekEnd) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor.getTime() + DAY_MS);
      const dayTasks = weekTasks
        .filter((t) => { const d = new Date(t.dueAt!); return d >= dayStart && d < dayEnd; })
        .sort((a, b) => a.title.localeCompare(b.title));
      const weekday = dayStart.toLocaleDateString("cs-CZ", { weekday: "short" });
      const dateStr = dayStart.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
      const label = idx === 0 ? "Dnes" : idx === 1 ? "Zítra" : weekday;
      days.push({ date: dayStart, label: `${label} · ${dateStr}`, tasks: dayTasks });
      cursor = new Date(dayEnd);
      idx++;
    }
    return days;
  }, [oneOff, todayStart, weekEnd]);

  const weekTaskCount = weekDays.reduce((s, d) => s + d.tasks.length, 0);

  // Hotové — deník podle dne odbavení.
  const doneGroups = useMemo(() => {
    const done = filtered
      .filter((t) => t.status === "done")
      .map((t) => ({ task: t, ts: t.doneAt ?? t.updatedAt ?? null }))
      .sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""));

    const groups: { key: string; label: string; items: { task: TaskRow; ts: string | null }[] }[] = [];
    const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
    for (const entry of done) {
      const d = entry.ts ? startOfDay(new Date(entry.ts)) : null;
      const key = d ? d.toISOString() : "unknown";
      let label: string;
      if (!d) label = "Bez data";
      else if (d.getTime() === todayStart.getTime()) label = "Dnes";
      else if (d.getTime() === yesterdayStart.getTime()) label = "Včera";
      else label = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

      let group = groups.find((g) => g.key === key);
      if (!group) { group = { key, label, items: [] }; groups.push(group); }
      group.items.push(entry);
    }
    return groups;
  }, [filtered, todayStart]);

  const doneCount = doneGroups.reduce((sum, g) => sum + g.items.length, 0);

  function assigneeColor(uid: string): string {
    const idx = users.findIndex((u) => u.id === uid);
    return ASSIGNEE_COLORS[(idx < 0 ? 0 : idx) % ASSIGNEE_COLORS.length];
  }

  // Úkoly nemají archiv: zmizí hned, smazání na serveru až po zavření toastu (lze vrátit).
  function handleDelete(task: TaskRow) {
    const restore = () =>
      setDeletedIds((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
    setDeletedIds((prev) => new Set(prev).add(task.id));
    deferredDelete({
      message: `Úkol „${task.title}" smazán`,
      onUndo: restore,
      commit: async () => {
        try {
          const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          router.refresh();
        } catch {
          restore();
          toast.error("Nepodařilo se smazat úkol");
        }
      },
    });
  }

  async function toggleStatus(taskId: string, current: string) {
    const newStatus = current === "open" ? "done" : "open";
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
      setOptimisticOverrides((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
      toast.error("Nepodařilo se změnit stav");
    }
  }

  /** Splnění pravidelného úkolu — jasná zpětná vazba s dalším termínem. */
  async function completeRecurring(task: TaskRow) {
    const next = nextOccurrence(task.dueAt, task.recurrence!);
    setOptimisticOverrides((prev) => ({ ...prev, [task.id]: "done" }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Splněno · další termín ${next.toLocaleDateString("cs-CZ")}`);
      setOptimisticOverrides((prev) => { const n = { ...prev }; delete n[task.id]; return n; });
      router.refresh();
    } catch {
      setOptimisticOverrides((prev) => { const n = { ...prev }; delete n[task.id]; return n; });
      toast.error("Nepodařilo se splnit úkol");
    }
  }

  /** Kulaté tlačítko s fajfkou pro odbavení jednorázového úkolu. Odbavit smí jen řešitel. */
  function CheckButton({ task }: { task: TaskRow }) {
    const isDone = task.status === "done";
    const canComplete = task.assigneeUid === currentUid;
    const disabled = optimisticOverrides[task.id] !== undefined || !canComplete;
    return (
      <button
        type="button"
        onClick={() => toggleStatus(task.id, task.status)}
        disabled={disabled}
        title={!canComplete ? "Splnit může jen řešitel úkolu" : undefined}
        aria-label={isDone ? "Označit jako nehotové" : "Označit jako hotové"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : canComplete
              ? "border-input text-transparent hover:border-primary hover:text-primary/40"
              : "border-input text-transparent cursor-not-allowed opacity-40"
        } ${optimisticOverrides[task.id] !== undefined ? "opacity-50" : ""}`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>
    );
  }

  function TaskMenu({ task }: { task: TaskRow }) {
    // Hotové úkoly nelze upravovat ani mazat.
    if (task.status === "done") return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Akce">
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
            <Pencil className="h-4 w-4" /> Upravit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(task)}>
            <Trash2 className="h-4 w-4" /> Smazat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /** Výrazný štítek s termínem. */
  function DateChip({ dateISO, overdue, prefix }: { dateISO: string; overdue?: boolean; prefix?: string }) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
          overdue
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-muted text-foreground"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5 opacity-70" />
        {prefix && <span className="font-normal text-muted-foreground">{prefix}</span>}
        {new Date(dateISO).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}
      </span>
    );
  }

  function AssigneeChip({ uid }: { uid: string }) {
    if (filter !== "all") return null;
    const assignee = users.find((u) => u.id === uid);
    if (!assignee) return null;
    return (
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${assigneeColor(uid)}`}>
        {assignee.displayName}
      </span>
    );
  }

  /** Řádek jednorázového úkolu (seznamy). */
  function renderTask(task: TaskRow, opts: { overdue?: boolean; showDate?: boolean; doneTs?: string | null } = {}) {
    const client = clients.find((c) => c.id === task.clientId);
    const isDone = task.status === "done";
    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs ${opts.overdue ? "border-destructive/50 bg-destructive/5" : ""}`}
      >
        <CheckButton task={task} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {client && <Badge variant="outline" className="text-[10px]">{client.name}</Badge>}
            <AssigneeChip uid={task.assigneeUid} />
          </div>
        </div>
        {isDone && opts.doneTs ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {new Date(opts.doneTs).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : opts.showDate && task.dueAt ? (
          <DateChip dateISO={task.dueAt} overdue={opts.overdue} />
        ) : null}
        <TaskMenu task={task} />
      </div>
    );
  }

  /** Kompaktní řádek úkolu do denního boxu. */
  function renderCompact(task: TaskRow) {
    const client = clients.find((c) => c.id === task.clientId);
    return (
      <div key={task.id} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2">
        <CheckButton task={task} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm">{task.title}</p>
          {client && <p className="truncate text-[10px] text-muted-foreground">{client.name}</p>}
        </div>
      </div>
    );
  }

  const hasAnyOpen = recurringTasks.length + oneOff.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Úkolovník</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/tasks/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nový úkol
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "mine" | "all")}>
        <TabsList className="sm:min-w-56">
          <TabsTrigger value="mine">Moje</TabsTrigger>
          <TabsTrigger value="all">Všechny</TabsTrigger>
        </TabsList>
      </Tabs>

      {!hasAnyOpen && (
        <p className="text-muted-foreground">Žádné otevřené úkoly 🎉</p>
      )}

      {/* Po termínu */}
      {overdue.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              Po termínu
            </h2>
            <span className="text-xs text-muted-foreground">{overdue.length}</span>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => renderTask(task, { overdue: true, showDate: true }))}
          </div>
        </section>
      )}

      {/* Tento týden — boxy po dnech */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Tento týden</h2>
          <span className="text-xs text-muted-foreground">{weekTaskCount}</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`rounded-xl border bg-card p-3 ${day.tasks.length === 0 ? "opacity-60" : ""}`}
            >
              <p className="mb-2 text-xs font-medium capitalize text-muted-foreground">{day.label}</p>
              <div className="space-y-1.5">
                {day.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">—</p>
                ) : (
                  day.tasks.map((task) => renderCompact(task))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Jednorázové vs Pravidelné — vedle sebe */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jednorázové — bez termínu a později */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <CircleDashed className="h-4 w-4 text-muted-foreground" />
              Jednorázové
            </h2>
            <span className="text-xs text-muted-foreground">{backlog.length}</span>
          </div>
          {backlog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nic dalšího v backlogu</p>
          ) : (
            <div className="space-y-2">
              {backlog.map((task) => renderTask(task, { showDate: true }))}
            </div>
          )}
        </section>

        {/* Pravidelné úkoly */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              Pravidelné úkoly
            </h2>
            <span className="text-xs text-muted-foreground">{recurringTasks.length}</span>
          </div>
          {recurringTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné pravidelné úkoly</p>
          ) : (
            <div className="space-y-2">
              {recurringTasks.map((task) => {
                const client = clients.find((c) => c.id === task.clientId);
                const overdueRec = task.dueAt && new Date(task.dueAt) < todayStart;
                const pending = optimisticOverrides[task.id] !== undefined;
                const canComplete = task.assigneeUid === currentUid;
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Repeat className="h-3 w-3" />
                          {taskRecurrenceLabels[task.recurrence as keyof typeof taskRecurrenceLabels] ?? task.recurrence}
                        </Badge>
                        {client && <Badge variant="outline" className="text-[10px]">{client.name}</Badge>}
                        {task.dueAt && (
                          <DateChip dateISO={task.dueAt} overdue={!!overdueRec} prefix={overdueRec ? "Termín" : "Příště"} />
                        )}
                        <AssigneeChip uid={task.assigneeUid} />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || !canComplete}
                      title={!canComplete ? "Splnit může jen řešitel úkolu" : undefined}
                      onClick={() => completeRecurring(task)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Splnit
                    </Button>
                    <TaskMenu task={task} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Hotové — deník */}
      {doneCount > 0 && (
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setDoneOpen((o) => !o)}
            className="flex w-full items-center gap-2 text-sm font-semibold"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${doneOpen ? "" : "-rotate-90"}`} />
            <CircleCheck className="h-4 w-4 text-muted-foreground" />
            <span>Hotové</span>
            <span className="text-xs font-normal text-muted-foreground">{doneCount}</span>
          </button>
          {doneOpen && (
            <div className="mt-4 space-y-6">
              {doneGroups.map((group) => (
                <section key={group.key} className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map(({ task, ts }) => renderTask(task, { doneTs: ts }))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
