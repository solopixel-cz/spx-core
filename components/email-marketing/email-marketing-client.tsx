"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { formatDateTime } from "@/lib/format";
import { Plus, FileCode, Users2, BarChart3, Contact, Send } from "lucide-react";

interface TemplateRow {
  id: string;
  name: string;
  subject: string | null;
  updatedAt: string | null;
}

interface ListRow {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  updatedAt: string | null;
}

interface CampaignRow {
  id: string;
  name: string;
  templateName: string | null;
  listName: string | null;
  status: string;
  totalRecipients: number;
  sentCount: number;
  opened: number;
  clicked: number;
  sentAt: string | null;
}

interface Counts {
  templates: number;
  lists: number;
  contacts: number;
  membersInLists: number;
  campaigns: number;
}

interface Overview {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)} %`;
}

export function EmailMarketingClient({
  templates,
  lists,
  campaigns,
  counts,
  overview,
}: {
  templates: TemplateRow[];
  lists: ListRow[];
  campaigns: CampaignRow[];
  counts: Counts;
  overview: Overview;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateList() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/marketing/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Seznam vytvořen");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      router.push(`/email-marketing/lists/${data.id}`);
    } catch {
      toast.error("Nepodařilo se vytvořit seznam");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Email marketing" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="campaigns">Kampaně</TabsTrigger>
          <TabsTrigger value="templates">Šablony</TabsTrigger>
          <TabsTrigger value="lists">Seznamy</TabsTrigger>
        </TabsList>

        {/* ---------- PŘEHLED ---------- */}
        <TabsContent value="overview" className="mt-5 space-y-6 md:mt-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile icon={Send} label="Kampaně" value={counts.campaigns} />
            <StatTile icon={FileCode} label="Šablony" value={counts.templates} />
            <StatTile icon={Users2} label="Seznamy" value={counts.lists} />
            <StatTile icon={Contact} label="Dostupné kontakty" value={counts.contacts} />
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Statistiky kampaní</h2>
            </div>
            {overview.sent === 0 ? (
              <p className="text-sm text-muted-foreground">
                Zatím jsi neodeslal žádnou kampaň. Otevření a prokliky se objeví po
                prvním odeslání.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xl font-bold">{overview.sent}</p>
                  <p className="text-xs text-muted-foreground">Odesláno</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xl font-bold">{overview.delivered}</p>
                  <p className="text-xs text-muted-foreground">
                    Doručeno · {pct(overview.delivered, overview.sent)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xl font-bold">{overview.opened}</p>
                  <p className="text-xs text-muted-foreground">
                    Otevřeno · {pct(overview.opened, overview.sent)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xl font-bold">{overview.clicked}</p>
                  <p className="text-xs text-muted-foreground">
                    Prokliky · {pct(overview.clicked, overview.sent)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ---------- KAMPANĚ ---------- */}
        <TabsContent value="campaigns" className="mt-5 space-y-4 md:mt-6">
          <div className="flex justify-end">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/email-marketing/campaigns/new" />}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nová kampaň
            </Button>
          </div>

          <EntityCardList>
            {campaigns.length === 0 ? (
              <EntityCardEmpty>Zatím žádné kampaně</EntityCardEmpty>
            ) : (
              campaigns.map((c) => (
                <EntityCard
                  key={c.id}
                  onClick={() => router.push(`/email-marketing/campaigns/${c.id}`)}
                  title={c.name}
                  subtitle={[c.templateName, c.listName].filter(Boolean).join(" → ")}
                  meta={
                    <>
                      <span>{c.sentCount}/{c.totalRecipients} odesláno</span>
                      <span>Otevřeno {c.opened}</span>
                      <span>Prokliky {c.clicked}</span>
                    </>
                  }
                />
              ))
            )}
          </EntityCardList>

          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampaň</TableHead>
                  <TableHead>Šablona → seznam</TableHead>
                  <TableHead>Odesláno</TableHead>
                  <TableHead>Otevřeno</TableHead>
                  <TableHead>Prokliky</TableHead>
                  <TableHead>Odesláno dne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Zatím žádné kampaně
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => (
                    <TableRow key={c.id} href={`/email-marketing/campaigns/${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[c.templateName, c.listName].filter(Boolean).join(" → ") || "—"}
                      </TableCell>
                      <TableCell>
                        {c.sentCount}/{c.totalRecipients}
                      </TableCell>
                      <TableCell>{c.opened}</TableCell>
                      <TableCell>{c.clicked}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(c.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------- ŠABLONY ---------- */}
        <TabsContent value="templates" className="mt-5 space-y-4 md:mt-6">
          <div className="flex justify-end">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/email-marketing/new" />}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nová šablona
            </Button>
          </div>

          <EntityCardList>
            {templates.length === 0 ? (
              <EntityCardEmpty>Zatím žádné šablony</EntityCardEmpty>
            ) : (
              templates.map((t) => (
                <EntityCard
                  key={t.id}
                  onClick={() => router.push(`/email-marketing/${t.id}`)}
                  title={t.name}
                  subtitle={t.subject ?? undefined}
                  meta={t.updatedAt && <span>Upraveno {formatDateTime(t.updatedAt)}</span>}
                />
              ))
            )}
          </EntityCardList>

          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Předmět</TableHead>
                  <TableHead>Upraveno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Zatím žádné šablony
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id} href={`/email-marketing/${t.id}`}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.subject || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(t.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------- SEZNAMY ---------- */}
        <TabsContent value="lists" className="mt-5 space-y-4 md:mt-6">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nový seznam
            </Button>
          </div>

          <EntityCardList>
            {lists.length === 0 ? (
              <EntityCardEmpty>Zatím žádné seznamy</EntityCardEmpty>
            ) : (
              lists.map((l) => (
                <EntityCard
                  key={l.id}
                  onClick={() => router.push(`/email-marketing/lists/${l.id}`)}
                  title={l.name}
                  subtitle={l.description ?? undefined}
                  meta={<span>{l.memberCount} kontaktů</span>}
                />
              ))
            )}
          </EntityCardList>

          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Kontaktů</TableHead>
                  <TableHead>Upraveno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Zatím žádné seznamy
                    </TableCell>
                  </TableRow>
                ) : (
                  lists.map((l) => (
                    <TableRow key={l.id} href={`/email-marketing/lists/${l.id}`}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.description || "—"}
                      </TableCell>
                      <TableCell>{l.memberCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(l.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Nový seznam dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nový seznam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Název *</Label>
              <Input
                id="list-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Např. Řemeslníci Praha"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-desc">Popis</Label>
              <Textarea
                id="list-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Volitelný popis seznamu"
              />
            </div>
            <Button
              onClick={handleCreateList}
              disabled={creating || !newName.trim()}
              className="w-full"
            >
              {creating ? "Vytvářím..." : "Vytvořit a přidat kontakty"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
