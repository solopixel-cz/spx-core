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
import { ticketFormSchema, type TicketFormData } from "@/lib/schemas/ticket";

interface UserOption {
  id: string;
  displayName: string;
}

interface InstanceOption {
  id: string;
  domain: string;
}

const typeItems = { bug: "Bug", change_request: "Změna" };
const priorityItems = { low: "Nízká", medium: "Střední", high: "Vysoká", urgent: "Urgentní" };

export function ClientTicketDialog({
  clientId,
  users,
  instances = [],
}: {
  clientId: string;
  users: UserOption[];
  instances?: InstanceOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ticketFormSchema) as any,
    defaultValues: { type: "bug", priority: "medium", clientId },
  });

  async function onSubmit(data: TicketFormData) {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, clientId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Ticket vytvořen");
      reset({ type: "bug", priority: "medium", clientId });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se vytvořit ticket");
    }
  }

  const userItems = Object.fromEntries(users.map((u) => [u.id, u.displayName]));
  const instanceItems = Object.fromEntries(instances.map((i) => [i.id, i.domain]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Nový ticket
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nový ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                items={typeItems}
                defaultValue="bug"
                onValueChange={(val) => {
                  if (val) setValue("type", val as TicketFormData["type"]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeItems).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorita</Label>
              <Select
                items={priorityItems}
                defaultValue="medium"
                onValueChange={(val) => {
                  if (val) setValue("priority", val as TicketFormData["priority"]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityItems).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketTitle">Titul *</Label>
            <Input id="ticketTitle" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketDesc">Popis *</Label>
            <Textarea id="ticketDesc" rows={4} {...register("description")} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Řešitel</Label>
              <Select
                items={userItems}
                onValueChange={(val) => {
                  if (val) setValue("assigneeUid", String(val));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Volitelné" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {instances.length > 0 && (
              <div className="space-y-2">
                <Label>Instance</Label>
                <Select
                  items={instanceItems}
                  onValueChange={(val) => {
                    if (val) setValue("instanceId", String(val));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Volitelné" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
