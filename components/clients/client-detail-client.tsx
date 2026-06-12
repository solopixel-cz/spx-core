"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil } from "lucide-react";
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
}) {
  const isSales = userRole === "sales";
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <Badge variant={statusVariants[client.status] ?? "secondary"}>
              {statusLabels[client.status] ?? client.status}
            </Badge>
          </div>
          {client.company && (
            <p className="mt-1 text-muted-foreground">{client.company}</p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>{client.email}</span>
            {client.phone && <span>{client.phone}</span>}
            <span>Slug: {client.advisorSlug}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prehled">
        <TabsList>
          <TabsTrigger value="prehled">Přehled</TabsTrigger>
          <TabsTrigger value="instance">Instance</TabsTrigger>
          {!isSales && <TabsTrigger value="faktury">Faktury</TabsTrigger>}
          <TabsTrigger value="ukoly">Úkoly</TabsTrigger>
          <TabsTrigger value="tickety">Tickety</TabsTrigger>
          <TabsTrigger value="aktivita">Aktivita</TabsTrigger>
        </TabsList>

        <TabsContent value="prehled" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
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
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Obchodní vlastník</h3>
                <p className="mt-1 text-xs text-muted-foreground">Obchodník s nárokem na provize z faktur tohoto klienta.</p>
                <Select
                  value={client.salesOwnerUid ?? "none"}
                  onValueChange={async (val) => {
                    const newUid = val === "none" ? null : val;
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
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
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
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Poznámky</h3>
              <p className="mt-2 text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instance" className="mt-6">
          <InstancesTab clientId={client.id} instances={instances} />
        </TabsContent>

        {!isSales && (
          <TabsContent value="faktury" className="mt-6">
            <ClientInvoicesTab invoices={invoices} />
          </TabsContent>
        )}

        <TabsContent value="ukoly" className="mt-6">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground">Žádné úkoly</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "done" ? "secondary" : "outline"}>{t.status === "done" ? "Hotovo" : "Otevřený"}</Badge>
                    {t.dueAt && <span className="text-xs text-muted-foreground">{new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickety" className="mt-6">
          {tickets.length === 0 ? (
            <p className="text-muted-foreground">Žádné tickety</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.type === "bug" ? "Bug" : "Změna"}</Badge>
                    <span className="text-sm font-medium">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.priority === "urgent" || t.priority === "high" ? "destructive" : "secondary"}>
                      {t.priority}
                    </Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aktivita" className="mt-6">
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
