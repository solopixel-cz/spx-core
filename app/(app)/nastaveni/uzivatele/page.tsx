"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRefresh } from "@/components/refresh-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UserX, UserCheck, KeyRound, Loader2 } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "member" | "sales";
  active: boolean;
  commissionRate?: number;
  senderEmail?: string;
  senderName?: string;
}

const addUserSchema = z.object({
  email: z.string().email("Zadejte platný e-mail"),
  displayName: z.string().min(1, "Zadejte jméno"),
  role: z.enum(["admin", "member", "sales"]),
});

type AddUserForm = z.infer<typeof addUserSchema>;

export default function UzivatelePage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Klíč právě probíhající řádkové akce, např. "uid-toggle" / "uid-reset" / "uid-role"
  const [actingKey, setActingKey] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useRefresh(fetchUsers);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { role: "member" },
  });

  async function onAddUser(data: AddUserForm) {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Nepodařilo se vytvořit uživatele");
      }

      const result = await res.json();
      toast.success(`Uživatel vytvořen. Dočasné heslo: ${result.tempPassword}`);
      setDialogOpen(false);
      reset();
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nepodařilo se vytvořit uživatele"
      );
    }
  }

  async function handleToggleActive(user: UserRow) {
    setActingKey(`${user.id}-toggle`);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });

      if (!res.ok) throw new Error();
      toast.success(
        user.active ? "Uživatel deaktivován" : "Uživatel aktivován"
      );
      fetchUsers();
    } catch {
      toast.error("Nepodařilo se změnit stav uživatele");
    } finally {
      setActingKey(null);
    }
  }

  async function handleResetPassword(userId: string) {
    setActingKey(`${userId}-reset`);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userId }),
      });
      if (!res.ok) throw new Error();
      const { tempPassword } = await res.json();
      toast.success(`Dočasné heslo: ${tempPassword}`, { duration: 15000 });
    } catch {
      toast.error("Nepodařilo se resetovat heslo");
    } finally {
      setActingKey(null);
    }
  }

  async function handleChangeRole(
    userId: string,
    newRole: "admin" | "member" | "sales"
  ) {
    setActingKey(`${userId}-role`);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error();
      toast.success("Role změněna");
      fetchUsers();
    } catch {
      toast.error("Nepodařilo se změnit roli");
    } finally {
      setActingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Uživatelé</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Přidat uživatele
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový uživatel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onAddUser)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Jméno</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && (
                  <p className="text-sm text-destructive">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  defaultValue="member"
                  onValueChange={(val) => {
                    if (val) setValue("role", val as "admin" | "member" | "sales");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Člen</SelectItem>
                    <SelectItem value="sales">Obchodník</SelectItem>
                    <SelectItem value="admin">Administrátor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Vytvářím..." : "Vytvořit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Odesílatel</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.displayName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    disabled={actingKey === `${user.id}-role`}
                    onValueChange={(val) =>
                      handleChangeRole(user.id, val as "admin" | "member" | "sales")
                    }
                  >
                    <SelectTrigger className="h-8 w-36">
                      {actingKey === `${user.id}-role` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Člen</SelectItem>
                      <SelectItem value="sales">Obchodník</SelectItem>
                      <SelectItem value="admin">Administrátor</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Input
                      className="h-7 text-xs w-40"
                      placeholder={user.email}
                      defaultValue={user.senderEmail ?? ""}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        if (val === (user.senderEmail ?? "")) return;
                        try {
                          const res = await fetch(`/api/users/${user.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ senderEmail: val || null }),
                          });
                          if (!res.ok) {
                            const data = await res.json();
                            toast.error(data.error || "Chyba");
                            return;
                          }
                          toast.success("Odesílatel uložen");
                          fetchUsers();
                        } catch {
                          toast.error("Nepodařilo se uložit");
                        }
                      }}
                    />
                    <Input
                      className="h-7 text-xs w-40"
                      placeholder={user.displayName}
                      defaultValue={user.senderName ?? ""}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        if (val === (user.senderName ?? "")) return;
                        try {
                          await fetch(`/api/users/${user.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ senderName: val || null }),
                          });
                          toast.success("Jméno odesílatele uloženo");
                          fetchUsers();
                        } catch {
                          toast.error("Nepodařilo se uložit");
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "default" : "secondary"}>
                    {user.active ? "Aktivní" : "Neaktivní"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetPassword(user.id)}
                      title="Resetovat heslo"
                      disabled={actingKey === `${user.id}-reset` || actingKey === `${user.id}-toggle`}
                    >
                      {actingKey === `${user.id}-reset` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(user)}
                      title={user.active ? "Deaktivovat" : "Aktivovat"}
                      disabled={actingKey === `${user.id}-toggle` || actingKey === `${user.id}-reset`}
                    >
                      {actingKey === `${user.id}-toggle` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Žádní uživatelé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
