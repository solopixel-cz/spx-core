"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { ticketFormSchema, type TicketFormData } from "@/lib/schemas/ticket";

interface TicketRow {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  createdAt: string | null;
}

interface ClientOption { id: string; name: string }
interface UserOption { id: string; displayName: string }

const typeLabels: Record<string, string> = { bug: "Bug", change_request: "Změna" };
const priorityLabels: Record<string, string> = { low: "Nízká", medium: "Střední", high: "Vysoká", urgent: "Urgentní" };
const statusLabels: Record<string, string> = {
  open: "Otevřený", in_progress: "V řešení", waiting_client: "Čeká na klienta",
  resolved: "Vyřešený", closed: "Uzavřený",
};
const priorityVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline", medium: "secondary", high: "default", urgent: "destructive",
};
const TICKET_STATUSES = ["open", "in_progress", "waiting_client", "resolved", "closed"];
const ASSIGNEE_NONE = "__none__";

export function TicketsPageClient({
  tickets,
  clients,
  users,
}: {
  tickets: TicketRow[];
  clients: ClientOption[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [now] = useState(() => Date.now());
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (clientFilter !== "all" && t.clientId !== clientFilter) return false;
    return true;
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ticketFormSchema) as any,
    defaultValues: { type: "bug", priority: "medium" },
  });

  const clientItems = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const assigneeItems = { [ASSIGNEE_NONE]: "Nepřiřazeno", ...Object.fromEntries(users.map((u) => [u.id, u.displayName])) };

  function openCreate() {
    setEditingTicket(null);
    reset({ type: "bug", priority: "medium", title: "", description: "", clientId: undefined, assigneeUid: undefined });
    setDialogOpen(true);
  }

  function openEdit(ticket: TicketRow) {
    setEditingTicket(ticket);
    reset({
      clientId: ticket.clientId,
      type: ticket.type as TicketFormData["type"],
      priority: ticket.priority as TicketFormData["priority"],
      title: ticket.title,
      description: ticket.description,
      assigneeUid: ticket.assigneeUid,
    });
    setSelectedTicket(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: TicketFormData) {
    try {
      const res = await fetch(
        editingTicket ? `/api/tickets/${editingTicket.id}` : "/api/tickets",
        {
          method: editingTicket ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(editingTicket ? "Ticket upraven" : "Ticket vytvořen");
      setDialogOpen(false);
      setEditingTicket(null);
      reset();
      router.refresh();
    } catch {
      toast.error(editingTicket ? "Nepodařilo se upravit ticket" : "Nepodařilo se vytvořit ticket");
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: string) {
    setChangingStatus(newStatus);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stav změněn");
      setSelectedTicket(null);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se změnit stav");
    } finally {
      setChangingStatus(null);
    }
  }

  async function handleArchive(ticket: TicketRow) {
    if (!window.confirm(`Smazat ticket „${ticket.title}"? Přesune se do archivu (lze obnovit).`)) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", collection: "tickets", id: ticket.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ticket smazán");
      setSelectedTicket(null);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se smazat ticket");
    } finally {
      setArchiving(false);
    }
  }

  function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return "";
    const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "dnes";
    if (days === 1) return "1 den";
    return `${days} dní`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Tickety</h1>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nový ticket</Button>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingTicket(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingTicket ? "Upravit ticket" : "Nový ticket"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Klient *</Label>
                  <Select items={clientItems} value={watch("clientId")} onValueChange={(val) => { if (val) setValue("clientId", String(val)); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select items={typeLabels} value={watch("type")} onValueChange={(val) => { if (val) setValue("type", val as TicketFormData["type"]); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                <Textarea id="ticketDesc" rows={3} {...register("description")} />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priorita</Label>
                  <Select items={priorityLabels} value={watch("priority")} onValueChange={(val) => { if (val) setValue("priority", val as TicketFormData["priority"]); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Řešitel</Label>
                  <Select
                    items={assigneeItems}
                    value={watch("assigneeUid") ?? ASSIGNEE_NONE}
                    onValueChange={(val) => setValue("assigneeUid", val && val !== ASSIGNEE_NONE ? String(val) : undefined)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ASSIGNEE_NONE}>Nepřiřazeno</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ukládám..." : editingTicket ? "Uložit" : "Vytvořit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <FilterBar>
        <Select items={{ all: "Všechny stavy", ...statusLabels }} value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ all: "Všechny typy", ...typeLabels }} value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ all: "Všechny priority", ...priorityLabels }} value={priorityFilter} onValueChange={(val) => setPriorityFilter(val ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          items={{
            all: "Všichni klienti",
            ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
          }}
          value={clientFilter}
          onValueChange={(val) => setClientFilter(val ?? "all")}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni klienti</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>Žádné tickety</EntityCardEmpty>
        ) : (
          filtered.map((t) => (
            <EntityCard
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              title={t.title}
              badge={
                <Badge variant={priorityVariants[t.priority] ?? "secondary"}>
                  {priorityLabels[t.priority] ?? t.priority}
                </Badge>
              }
              subtitle={t.clientName}
              meta={
                <>
                  <span>{typeLabels[t.type] ?? t.type}</span>
                  <span>{statusLabels[t.status] ?? t.status}</span>
                  {t.createdAt && <span>{getTimeSince(t.createdAt)}</span>}
                </>
              }
            />
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Typ</TableHead>
              <TableHead>Titul</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Priorita</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Stáří</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Žádné tickety</TableCell></TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedTicket(t)}>
                  <TableCell><Badge variant="outline">{typeLabels[t.type] ?? t.type}</Badge></TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.clientName}</TableCell>
                  <TableCell><Badge variant={priorityVariants[t.priority] ?? "secondary"}>{priorityLabels[t.priority] ?? t.priority}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{statusLabels[t.status] ?? t.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{getTimeSince(t.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTicket && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <SheetTitle>{selectedTicket.title}</SheetTitle>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedTicket)}>
                    <Pencil className="mr-1 h-4 w-4" /> Upravit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleArchive(selectedTicket)}
                    disabled={archiving}
                  >
                    {archiving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                    Smazat
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{typeLabels[selectedTicket.type]}</Badge>
                <Badge variant={priorityVariants[selectedTicket.priority]}>{priorityLabels[selectedTicket.priority]}</Badge>
                <Badge variant="secondary">{statusLabels[selectedTicket.status]}</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Klient</dt>
                  <dd>{selectedTicket.clientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Řešitel</dt>
                  <dd>{users.find((u) => u.id === selectedTicket.assigneeUid)?.displayName ?? "Nepřiřazeno"}</dd>
                </div>
              </dl>
              <Separator />
              <div className="space-y-2">
                <Label>Změnit stav</Label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === selectedTicket.status ? "default" : "outline"}
                      onClick={() => handleStatusChange(selectedTicket.id, s)}
                      disabled={s === selectedTicket.status || changingStatus !== null}
                    >
                      {changingStatus === s && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
