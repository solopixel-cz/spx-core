"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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

export function ClientTaskDialog({
  clientId,
  users,
  currentUid,
}: {
  clientId: string;
  users: UserOption[];
  currentUid: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { status: "open", assigneeUid: currentUid, clientId, recurrence: "none" },
  });

  async function onSubmit(data: TaskFormData) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, clientId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Úkol vytvořen");
      reset({ status: "open", assigneeUid: currentUid, clientId, recurrence: "none" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se vytvořit úkol");
    }
  }

  const userItems = Object.fromEntries(users.map((u) => [u.id, u.displayName]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Nový úkol
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nový úkol</DialogTitle>
        </DialogHeader>
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
            <Textarea id="taskDesc" rows={3} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Řešitel *</Label>
              <Select
                items={userItems}
                defaultValue={currentUid}
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
            <div className="space-y-2">
              <Label htmlFor="taskDue">Termín</Label>
              <Input id="taskDue" type="date" {...register("dueAt")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Opakování</Label>
            <Select
              items={taskRecurrenceLabels}
              defaultValue="none"
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
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Zrušit</Button>} />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Vytvářím..." : "Vytvořit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
