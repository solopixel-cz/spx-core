"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormActions } from "@/components/form-actions";

const addUserSchema = z.object({
  email: z.string().email("Zadejte platný e-mail"),
  displayName: z.string().min(1, "Zadejte jméno"),
  role: z.enum(["admin", "member", "sales"]),
});

type AddUserForm = z.infer<typeof addUserSchema>;

const roleItems = { member: "Člen", sales: "Obchodník", admin: "Administrátor" };

/**
 * Nový uživatel (`/settings/users/new`). Po vytvoření zůstane na stránce
 * dočasné heslo ke zkopírování (dřív jen v mizejícím toastu).
 */
export function NewUserForm() {
  const router = useRouter();
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { role: "member" },
  });

  async function onSubmit(data: AddUserForm) {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Nepodařilo se vytvořit uživatele");
      }
      const result = (await res.json()) as { tempPassword: string };
      setCreated({ email: data.email, tempPassword: result.tempPassword });
      toast.success("Uživatel vytvořen");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodařilo se vytvořit uživatele");
    }
  }

  if (created) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Účet <span className="font-medium text-foreground">{created.email}</span> je
          vytvořený. Předejte uživateli dočasné heslo, po přihlášení si ho změní.
        </p>
        <div className="space-y-2">
          <Label>Dočasné heslo</Label>
          <div className="flex gap-2">
            <Input value={created.tempPassword} readOnly className="font-mono" />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(created.tempPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Zkopírováno" : "Kopírovat"}
            </Button>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href="/settings/users" />}>
          Hotovo
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoFocus {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Jméno</Label>
        <Input id="displayName" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-sm text-destructive">{errors.displayName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          items={roleItems}
          value={watch("role")}
          onValueChange={(val) => {
            if (val) setValue("role", val as AddUserForm["role"]);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Člen</SelectItem>
            <SelectItem value="sales">Obchodník</SelectItem>
            <SelectItem value="admin">Administrátor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FormActions
        cancelHref="/settings/users"
        submitting={isSubmitting}
        submittingLabel="Vytvářím..."
        submitLabel="Vytvořit"
      />
    </form>
  );
}
