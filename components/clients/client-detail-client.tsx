"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";
import { InstancesTab } from "./instances-tab";
import { ActivityTab } from "./activity-tab";

interface ClientData {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  status: string;
  advisorSlug: string;
  notes?: string;
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
}: {
  client: ClientData;
  instances: InstanceData[];
  activities: ActivityData[];
}) {
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
            email: client.email,
            phone: client.phone ?? "",
            status: client.status as "onboarding" | "active" | "paused" | "churned",
            advisorSlug: client.advisorSlug,
            notes: client.notes ?? "",
          }}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prehled">
        <TabsList>
          <TabsTrigger value="prehled">Přehled</TabsTrigger>
          <TabsTrigger value="instance">Instance</TabsTrigger>
          <TabsTrigger value="faktury">Faktury</TabsTrigger>
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
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Advisor Slug</dt>
                  <dd>{client.advisorSlug}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Přehled</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Instance</dt>
                  <dd>{instances.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Předplatné</dt>
                  <dd className="text-muted-foreground">—</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Otevřené úkoly</dt>
                  <dd className="text-muted-foreground">—</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Otevřené tickety</dt>
                  <dd className="text-muted-foreground">—</dd>
                </div>
              </dl>
            </div>
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

        <TabsContent value="faktury" className="mt-6">
          <p className="text-muted-foreground">Doplní fáze 5.</p>
        </TabsContent>

        <TabsContent value="ukoly" className="mt-6">
          <p className="text-muted-foreground">Doplní fáze 6.</p>
        </TabsContent>

        <TabsContent value="tickety" className="mt-6">
          <p className="text-muted-foreground">Doplní fáze 6.</p>
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
