"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormActions } from "@/components/form-actions";
import {
  taskFormSchema,
  taskRecurrenceLabels,
  TASK_RECURRENCES,
  type TaskFormData,
} from "@/lib/schemas/task";

interface UserOption {
  id: string;
  displayName: string;
}
interface ClientOption {
  id: string;
  name: string;
}

export interface TaskFormValues {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  assigneeUid: string;
  dueAt: string | null;
  recurrence?: string;
  status: string;
}

const NO_CLIENT = "__none__";

/**
 * Formulář úkolu na routách `/tasks/new` a `/tasks/[id]/edit`. Z detailu
 * klienta přichází s předvyplněným klientem (`defaultClientId`).
 */
export function TaskForm({
  task,
  users,
  clients,
  currentUid,
  defaultClientId,
  backHref,
}: {
  task?: TaskFormValues;
  users: UserOption[];
  clients: ClientOption[];
  currentUid: string;
  defaultClientId?: string;
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskFormSchema) as any,
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? "",
          clientId: task.clientId,
          assigneeUid: task.assigneeUid,
          dueAt: task.dueAt ? task.dueAt.split("T")[0] : "",
          recurrence: (task.recurrence as TaskFormData["recurrence"]) ?? "none",
          status: task.status as TaskFormData["status"],
        }
      : {
          status: "open",
          assigneeUid: currentUid,
          recurrence: "none",
          clientId: defaultClientId,
          dueAt: "",
        },
  });

  // Vazbu na klienta API zrušit neumí, „Bez klienta" jen dokud žádná není.
  const allowNoClient = !task?.clientId;
  const clientItems = {
    ...(allowNoClient ? { [NO_CLIENT]: "Bez klienta" } : {}),
    ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
  };
  const userItems = Object.fromEntries(users.map((u) => [u.id, u.displayName]));

  async function onSubmit(data: TaskFormData) {
    try {
      const res = await fetch(isEdit ? `/api/tasks/${task!.id}` : "/api/tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      toast.success(isEdit ? "Úkol upraven" : "Úkol vytvořen");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : isEdit
            ? "Nepodařilo se upravit úkol"
            : "Nepodařilo se vytvořit úkol"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="taskTitle">Titul *</Label>
        <div className="flex gap-2">
          <Input id="taskTitle" className="flex-1" autoFocus={!isEdit} {...register("title")} />
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
        <Textarea id="taskDesc" rows={3} {...register("description")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Klient</Label>
          <Select
            items={clientItems}
            value={watch("clientId") || NO_CLIENT}
            onValueChange={(val) =>
              setValue("clientId", !val || val === NO_CLIENT ? undefined : String(val))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowNoClient && <SelectItem value={NO_CLIENT}>Bez klienta</SelectItem>}
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Řešitel *</Label>
          <Select
            items={userItems}
            value={watch("assigneeUid")}
            onValueChange={(val) => {
              if (val) setValue("assigneeUid", String(val));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assigneeUid && (
            <p className="text-sm text-destructive">{errors.assigneeUid.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taskDue">Termín</Label>
          <Input id="taskDue" type="date" {...register("dueAt")} />
        </div>
        <div className="space-y-2">
          <Label>Opakování</Label>
          <Select
            items={taskRecurrenceLabels}
            value={watch("recurrence") ?? "none"}
            onValueChange={(val) => {
              if (val) setValue("recurrence", val as TaskFormData["recurrence"]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_RECURRENCES.map((r) => (
                <SelectItem key={r} value={r}>
                  {taskRecurrenceLabels[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Po odškrtnutí se založí další výskyt s posunutým termínem.
          </p>
        </div>
      </div>

      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Vytvořit úkol"}
      />
    </form>
  );
}
