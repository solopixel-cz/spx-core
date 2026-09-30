"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Link2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormActions } from "@/components/form-actions";
import { ticketFormSchema, type TicketFormData } from "@/lib/schemas/ticket";
import { ticketPriorityLabels, ticketTypeLabels } from "@/lib/ticket-labels";

interface UserOption {
  id: string;
  displayName: string;
}
interface ClientOption {
  id: string;
  name: string;
}
interface InstanceOption {
  id: string;
  clientId: string;
  domain: string;
}

export interface TicketFormValues {
  id: string;
  clientId: string;
  instanceId?: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  assigneeUid?: string;
  links: string[];
}

const NONE = "__none__";

/** Doplní https:// když chybí schéma, ať uživatel nemusí psát celý protokol. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Formulář ticketu na routách `/tickets/new` a `/tickets/[id]/edit`. Z detailu
 * klienta přichází s předvyplněným klientem. Vizitku/web lze vybrat z instancí
 * zvoleného klienta.
 */
export function TicketForm({
  ticket,
  clients,
  users,
  instances,
  defaultClientId,
  backHref,
  doneHref,
}: {
  ticket?: TicketFormValues;
  clients: ClientOption[];
  users: UserOption[];
  instances: InstanceOption[];
  defaultClientId?: string;
  backHref: string;
  /** Kam po uložení (výchozí `backHref`). */
  doneHref?: string;
}) {
  const router = useRouter();
  const isEdit = !!ticket;
  // Odkazy k tiketu (např. fotky na Google Drive), spravované mimo react-hook-form.
  const [links, setLinks] = useState<string[]>(ticket?.links ?? []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ticketFormSchema) as any,
    defaultValues: ticket
      ? {
          clientId: ticket.clientId,
          instanceId: ticket.instanceId,
          type: ticket.type as TicketFormData["type"],
          priority: ticket.priority as TicketFormData["priority"],
          title: ticket.title,
          description: ticket.description,
          assigneeUid: ticket.assigneeUid,
        }
      : { type: "bug", priority: "medium", clientId: defaultClientId },
  });

  const clientId = watch("clientId");
  const clientInstances = instances.filter((i) => i.clientId === clientId);
  const clientItems = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const assigneeItems = {
    [NONE]: "Nepřiřazeno",
    ...Object.fromEntries(users.map((u) => [u.id, u.displayName])),
  };
  const instanceItems = {
    [NONE]: "Nevybráno",
    ...Object.fromEntries(clientInstances.map((i) => [i.id, i.domain])),
  };

  async function onSubmit(data: TicketFormData) {
    // Normalizace + validace odkazů: doplnit protokol, zahodit prázdné, ověřit URL.
    const normalizedLinks = links.map(normalizeUrl).filter(Boolean);
    const invalid = normalizedLinks.find((l) => {
      try {
        new URL(l);
        return false;
      } catch {
        return true;
      }
    });
    if (invalid) {
      toast.error(`Neplatný odkaz: ${invalid}`);
      return;
    }

    try {
      const res = await fetch(isEdit ? `/api/tickets/${ticket!.id}` : "/api/tickets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, links: normalizedLinks }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      toast.success(isEdit ? "Ticket upraven" : "Ticket vytvořen");
      router.push(doneHref ?? backHref);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : isEdit
            ? "Nepodařilo se upravit ticket"
            : "Nepodařilo se vytvořit ticket"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Klient *</Label>
          <Select
            items={clientItems}
            value={clientId}
            onValueChange={(val) => {
              if (!val) return;
              setValue("clientId", String(val));
              setValue("instanceId", undefined);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select
            items={ticketTypeLabels}
            value={watch("type")}
            onValueChange={(val) => {
              if (val) setValue("type", val as TicketFormData["type"]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ticketTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticketTitle">Titul *</Label>
        <Input id="ticketTitle" autoFocus={!isEdit} {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticketDesc">Popis *</Label>
        <Textarea id="ticketDesc" rows={5} {...register("description")} />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Priorita</Label>
          <Select
            items={ticketPriorityLabels}
            value={watch("priority")}
            onValueChange={(val) => {
              if (val) setValue("priority", val as TicketFormData["priority"]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ticketPriorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Řešitel</Label>
          <Select
            items={assigneeItems}
            value={watch("assigneeUid") ?? NONE}
            onValueChange={(val) =>
              setValue("assigneeUid", val && val !== NONE ? String(val) : undefined)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nepřiřazeno</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {clientInstances.length > 0 && (
        <div className="space-y-2">
          <Label>Vizitka / web</Label>
          <Select
            items={instanceItems}
            value={watch("instanceId") ?? NONE}
            onValueChange={(val) =>
              setValue("instanceId", val && val !== NONE ? String(val) : undefined)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nevybráno</SelectItem>
              {clientInstances.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Odkazy</Label>
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={link}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = e.target.value;
                    setLinks(next);
                  }}
                  placeholder="např. https://drive.google.com/..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                  aria-label="Odebrat odkaz"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, ""])}>
          <Plus className="mr-2 h-4 w-4" />
          Přidat odkaz
        </Button>
      </div>

      <FormActions
        cancelHref={backHref}
        submitting={isSubmitting}
        submitLabel={isEdit ? "Uložit" : "Vytvořit ticket"}
      />
    </form>
  );
}
