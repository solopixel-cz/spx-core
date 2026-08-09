"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil,
  Archive,
  RotateCcw,
  Send,
  Loader2,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ClientFormDialog } from "./client-form-dialog";
import { InstancesTab } from "./instances-tab";
import { ActivityTab } from "./activity-tab";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { ClientInvoicesTab } from "./client-invoices-tab";
import { CardFormButton } from "./card-form-button";
import { DeliveryDialog } from "./delivery-dialog";

interface ClientData {
  id: string;
  name: string;
  company?: string;
  ico?: string;
  dic?: string;
  email: string;
  phone?: string;
  status: string;
  advisorSlug: string;
  notes?: string;
  salesOwnerUid: string | null;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface InstanceData {
  id: string;
  clientId: string;
  advisorSlug: string;
  domain: string;
  status: string;
  version: string;
  repoUrl?: string;
  deployUrl?: string;
  features: string[];
  notes?: string;
}

interface ActivityData {
  id: string;
  kind: string;
  text: string;
  actorUid: string;
  createdAt: string | null;
}

interface SubData {
  id: string;
  plan: string;
  priceMonthly: number;
  billingCycle: string;
  status: string;
  startedAt: string | null;
  nextInvoiceAt: string | null;
}

interface InvoiceData {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
}

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Aktivní",
  paused: "Pozastavený",
  churned: "Odešlý",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  onboarding: "outline",
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

const priorityLabels: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

const ticketStatusLabels: Record<string, string> = {
  open: "Otevřený",
  in_progress: "V řešení",
  waiting_client: "Čeká na klienta",
  resolved: "Vyřešený",
  closed: "Uzavřený",
};

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

/** Kontaktní pill chip — s odkazem (mailto/tel/web) je klikatelný. */
function ContactChip({
  href,
  icon,
  children,
}: {
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm";
  if (href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          base,
          "transition-all hover:border-primary/40 hover:text-primary active:scale-[0.98]"
        )}
      >
        {icon}
        <span className="truncate">{children}</span>
      </a>
    );
  }
  return (
    <span className={cn(base, "text-muted-foreground")}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Přehledová dlaždice — tapnutí přepne na příslušnou záložku. */
function StatTile({
  label,
  value,
  hint,
  alert,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl border bg-card p-4 text-left shadow-xs transition-all hover:border-primary/40 active:scale-[0.98]"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-bold tabular-nums",
          alert && "text-destructive"
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      )}
    </button>
  );
}

export function ClientDetailClient({
  client,
  instances,
  activities,
  subscription = null,
  invoices = [],
  tasks = [],
  tickets = [],
  salesUsers = [],
  userRole = "member" as "admin" | "member" | "sales",
  lastDelivery = null,
}: {
  client: ClientData;
  instances: InstanceData[];
  activities: ActivityData[];
  subscription?: SubData | null;
  invoices?: InvoiceData[];
  tasks?: Array<{ id: string; title: string; status: string; dueAt: string | null; assigneeUid: string }>;
  tickets?: Array<{ id: string; type: string; title: string; priority: string; status: string; createdAt: string | null }>;
  salesUsers?: Array<{ id: string; displayName: string }>;
  userRole?: "admin" | "member" | "sales";
  lastDelivery?: { id: string; sentAt: string | null; status: string } | null;
}) {
  const isSales = userRole === "sales";
  const isAdminOrMember = !isSales;
  const isArchived = !!client.deletedAt;
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);
  const [tab, setTab] = useState("prehled");

  // Souhrny pro přehledové dlaždice
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const openTickets = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status)
  ).length;
  const unpaidInvoices = invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue"
  ).length;
  const overdueInvoices = invoices.filter((i) => i.status === "overdue").length;
  const primaryInstance = instances[0];

  async function handleArchive() {
    if (!confirm("Opravdu archivovat tohoto klienta? Instance, tickety a předplatné budou archivovány/zrušeny.")) return;
    setActing(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", collection: "clients", id: client.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Klient archivován");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se archivovat");
    } finally {
      setActing(false);
    }
  }

  async function handleRestore() {
    setActing(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", collection: "clients", id: client.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Klient obnoven");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se obnovit");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Archived banner */}
      {isArchived && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Archivováno</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString("cs-CZ") : ""}
            </p>
          </div>
          {isAdminOrMember && (
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={acting}>
              {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Obnovit
            </Button>
          )}
        </div>
      )}

      {/* Hero — vše důležité na první pohled */}
      <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary md:size-14 md:text-xl">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                {client.name}
              </h1>
              <Badge variant={statusVariants[client.status] ?? "secondary"}>
                {statusLabels[client.status] ?? client.status}
              </Badge>
            </div>
            {client.company && (
              <p className="mt-0.5 text-sm text-muted-foreground md:text-base">
                {client.company}
              </p>
            )}
          </div>
        </div>

        {/* Kontaktní chipy — na mobilu rovnou volat / psát / otevřít vizitku */}
        <div className="mt-4 flex flex-wrap gap-2">
          <ContactChip
            href={`mailto:${client.email}`}
            icon={<Mail className="h-3.5 w-3.5 shrink-0" />}
          >
            {client.email}
          </ContactChip>
          {client.phone && (
            <ContactChip
              href={`tel:${client.phone.replace(/\s/g, "")}`}
              icon={<Phone className="h-3.5 w-3.5 shrink-0" />}
            >
              {client.phone}
            </ContactChip>
          )}
          {primaryInstance && (
            <ContactChip
              href={primaryInstance.deployUrl}
              icon={<Globe className="h-3.5 w-3.5 shrink-0" />}
            >
              {primaryInstance.domain}
            </ContactChip>
          )}
        </div>

        {/* Akce */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <ClientFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={() => {
              setEditOpen(false);
              router.refresh();
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Upravit
              </Button>
            }
            defaultValues={{
              id: client.id,
              name: client.name,
              company: client.company ?? "",
              ico: client.ico ?? "",
              dic: client.dic ?? "",
              email: client.email,
              phone: client.phone ?? "",
              status: client.status as "onboarding" | "active" | "paused" | "churned",
              advisorSlug: client.advisorSlug,
              notes: client.notes ?? "",
            }}
          />
          <CardFormButton
            clientId={client.id}
            clientName={client.name}
            clientEmail={client.email}
          />
          {client.email && instances.length > 0 && !isArchived && (
            <DeliveryDialog
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email}
              instances={instances.map((i) => ({
                id: i.id,
                domain: i.domain,
                status: i.status,
              }))}
              lastDelivery={lastDelivery}
              trigger={
                <Button variant="outline" size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Předat vizitku
                </Button>
              }
            />
          )}
          {isAdminOrMember && !isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={acting}
              className="ml-auto text-muted-foreground"
            >
              {acting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Archivovat
            </Button>
          )}
        </div>
      </div>

      {/* Přehledové dlaždice — tapnutí přepne na záložku */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Instance"
          value={instances.length}
          hint={primaryInstance?.domain ?? "Žádná instance"}
          onClick={() => setTab("instance")}
        />
        {!isSales && (
          <StatTile
            label="Faktury"
            value={unpaidInvoices}
            hint={
              overdueInvoices > 0
                ? `${overdueInvoices} po splatnosti`
                : "nezaplacené"
            }
            alert={overdueInvoices > 0}
            onClick={() => setTab("faktury")}
          />
        )}
        <StatTile
          label="Úkoly"
          value={openTasks}
          hint="otevřené"
          onClick={() => setTab("ukoly")}
        />
        <StatTile
          label="Tickety"
          value={openTickets}
          hint="otevřené"
          onClick={() => setTab("tickety")}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="prehled">Přehled</TabsTrigger>
          <TabsTrigger value="instance">Instance</TabsTrigger>
          {!isSales && <TabsTrigger value="faktury">Faktury</TabsTrigger>}
          <TabsTrigger value="ukoly">Úkoly</TabsTrigger>
          <TabsTrigger value="tickety">Tickety</TabsTrigger>
          <TabsTrigger value="aktivita">Aktivita</TabsTrigger>
        </TabsList>

        <TabsContent value="prehled" className="mt-5 space-y-4 md:mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 shadow-xs">
              <h3 className="font-semibold">Kontakty</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd>{client.email}</dd>
                </div>
                {client.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Telefon</dt>
                    <dd>{client.phone}</dd>
                  </div>
                )}
                {client.ico && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IČO</dt>
                    <dd>{client.ico}</dd>
                  </div>
                )}
                {client.dic && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">DIČ</dt>
                    <dd>{client.dic}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Advisor Slug</dt>
                  <dd>{client.advisorSlug}</dd>
                </div>
              </dl>
            </div>
            {!isSales && <SubscriptionCard clientId={client.id} subscription={subscription} />}
            {!isSales && salesUsers.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 shadow-xs">
                <h3 className="font-semibold">Obchodní vlastník</h3>
                <p className="mt-1 text-xs text-muted-foreground">Obchodník s nárokem na provize z faktur tohoto klienta.</p>
                <Select
                  items={{
                    none: "— Bez vlastníka —",
                    ...Object.fromEntries(
                      salesUsers.map((u) => [u.id, u.displayName])
                    ),
                  }}
                  value={client.salesOwnerUid ?? "none"}
                  disabled={savingOwner}
                  onValueChange={async (val) => {
                    const newUid = val === "none" ? null : val;
                    setSavingOwner(true);
                    try {
                      const res = await fetch(`/api/clients/${client.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ salesOwnerUid: newUid }),
                      });
                      if (!res.ok) throw new Error();
                      toast.success("Vlastník uložen");
                      router.refresh();
                    } catch {
                      toast.error("Nepodařilo se změnit vlastníka");
                    } finally {
                      setSavingOwner(false);
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
                    {savingOwner && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <SelectValue placeholder="Vyberte obchodníka" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Bez vlastníka —</SelectItem>
                    {salesUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="rounded-2xl border bg-card p-4 shadow-xs md:col-span-2">
              <h3 className="font-semibold">Poznámky</h3>
              <p className="mt-2 text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instance" className="mt-5 md:mt-6">
          <InstancesTab clientId={client.id} instances={instances} />
        </TabsContent>

        {!isSales && (
          <TabsContent value="faktury" className="mt-5 md:mt-6">
            <ClientInvoicesTab invoices={invoices} />
          </TabsContent>
        )}

        <TabsContent value="ukoly" className="mt-5 md:mt-6">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground">Žádné úkoly</p>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-xs"
                >
                  <span className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "font-medium"}`}>{t.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "done" ? "secondary" : "outline"}>{t.status === "done" ? "Hotovo" : "Otevřený"}</Badge>
                    {t.dueAt && <span className="text-xs text-muted-foreground">{new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickety" className="mt-5 md:mt-6">
          {tickets.length === 0 ? (
            <p className="text-muted-foreground">Žádné tickety</p>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card p-3.5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {t.title}
                    </span>
                    <Badge
                      variant={
                        t.priority === "urgent" || t.priority === "high"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {priorityLabels[t.priority] ?? t.priority}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{t.type === "bug" ? "Bug" : "Změna"}</span>
                    <span>{ticketStatusLabels[t.status] ?? t.status}</span>
                    {t.createdAt && (
                      <span>
                        {new Date(t.createdAt).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aktivita" className="mt-5 md:mt-6">
          <ActivityTab
            entityType="client"
            entityId={client.id}
            activities={activities}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
