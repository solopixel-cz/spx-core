"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { leadFormSchema, type LeadFormData } from "@/lib/schemas/lead";
import type { UserOption } from "./leads-page-client";
import { sourceLabels } from "./leads-page-client";

export function LeadFormDialog({
  open,
  onOpenChange,
  onSuccess,
  users,
  currentUid,
  trigger,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: UserOption[];
  currentUid: string;
  trigger: React.ReactElement;
  defaultValues?: Partial<LeadFormData> & { id?: string };
}) {
  const isEdit = !!defaultValues?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(leadFormSchema) as any,
    defaultValues: {
      stage: "new",
      source: "web",
      ownerUid: currentUid,
      ...defaultValues,
    },
  });

  async function onSubmit(data: LeadFormData) {
    try {
      const url = isEdit ? `/api/leads/${defaultValues!.id}` : "/api/leads";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }

      toast.success(isEdit ? "Lead aktualizován" : "Lead vytvořen");
      reset();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit lead");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit lead" : "Nový lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadName">Jméno *</Label>
              <Input id="leadName" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadCompany">Firma</Label>
              <Input id="leadCompany" {...register("company")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadEmail">E-mail</Label>
              <Input id="leadEmail" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadPhone">Telefon</Label>
              <Input id="leadPhone" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Zdroj</Label>
              <Select
                defaultValue={defaultValues?.source ?? "web"}
                onValueChange={(val) => setValue("source", val as LeadFormData["source"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadValue">Hodnota (Kč/rok)</Label>
              <Input id="leadValue" type="number" {...register("value")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vlastník</Label>
            <Select
              defaultValue={defaultValues?.ownerUid ?? currentUid}
              onValueChange={(val) => { if (val) setValue("ownerUid", val); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ownerUid && <p className="text-sm text-destructive">{errors.ownerUid.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadNotes">Poznámky</Label>
            <Input id="leadNotes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Vytvořit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
