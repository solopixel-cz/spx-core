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
import { clientFormSchema, type ClientFormData } from "@/lib/schemas/client";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger: React.ReactElement;
  defaultValues?: Partial<ClientFormData> & { id?: string };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  onSuccess,
  trigger,
  defaultValues,
}: ClientFormDialogProps) {
  const isEdit = !!defaultValues?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      status: "onboarding",
      ...defaultValues,
    },
  });

  async function onSubmit(data: ClientFormData) {
    try {
      const url = isEdit
        ? `/api/clients/${defaultValues!.id}`
        : "/api/clients";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chyba při ukládání");
      }

      toast.success(isEdit ? "Klient aktualizován" : "Klient vytvořen");
      reset();
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nepodařilo se uložit klienta"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upravit klienta" : "Nový klient"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Jméno *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Firma</Label>
              <Input id="company" {...register("company")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ico">IČO</Label>
              <Input id="ico" {...register("ico")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dic">DIČ</Label>
              <Input id="dic" {...register("dic")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingStreet">Ulice a č.p.</Label>
            <Input id="billingStreet" {...register("billingStreet")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingZip">PSČ</Label>
              <Input id="billingZip" {...register("billingZip")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingCity">Město</Label>
              <Input id="billingCity" {...register("billingCity")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advisorSlug">Advisor Slug *</Label>
              <Input id="advisorSlug" {...register("advisorSlug")} />
              {errors.advisorSlug && (
                <p className="text-sm text-destructive">
                  {errors.advisorSlug.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Stav</Label>
              <Select
                defaultValue={defaultValues?.status ?? "onboarding"}
                onValueChange={(val) =>
                  setValue(
                    "status",
                    val as ClientFormData["status"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="paused">Pozastavený</SelectItem>
                  <SelectItem value="churned">Odešlý</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Poznámky</Label>
            <Input id="notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ukládám..." : isEdit ? "Uložit" : "Vytvořit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
