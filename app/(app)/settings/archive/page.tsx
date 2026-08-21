"use client";

import { useState, useEffect, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { RotateCcw, Trash2, Archive } from "lucide-react";

interface ArchivedItem {
  id: string;
  collection: string;
  name: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

const collectionLabels: Record<string, string> = {
  clients: "Klient",
  instances: "Instance",
  leads: "Lead",
  tickets: "Ticket",
  prospects: "Oslovení",
};

export default function ArchivPage() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedItem | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/archive");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useRefresh(fetchItems);

  const filtered = typeFilter === "all"
    ? items
    : items.filter((i) => i.collection === typeFilter);

  async function handleRestore(item: ArchivedItem) {
    setActing(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", collection: item.collection, id: item.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${collectionLabels[item.collection]} „${item.name}" obnoven`);
      fetchItems();
    } catch {
      toast.error("Nepodařilo se obnovit");
    } finally {
      setActing(false);
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget || deleteConfirmName !== deleteTarget.name) return;
    setActing(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", collection: deleteTarget.collection, id: deleteTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se smazat");
        return;
      }
      toast.success("Trvale smazáno");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmName("");
      fetchItems();
    } catch {
      toast.error("Nepodařilo se smazat");
    } finally {
      setActing(false);
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Trvale smazat ${selected.size} vybraných záznamů? Záznamy s vazbami budou přeskočeny.`)) return;
    setBatchDeleting(true);
    let deleted = 0;
    let skipped = 0;
    for (const key of selected) {
      const item = items.find((i) => `${i.collection}-${i.id}` === key);
      if (!item) continue;
      try {
        const res = await fetch("/api/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", collection: item.collection, id: item.id }),
        });
        if (res.ok) deleted++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    toast.success(`Smazáno: ${deleted}, přeskočeno (vazby): ${skipped}`);
    setSelected(new Set());
    setBatchDeleting(false);
    fetchItems();
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (loading) return <p className="text-muted-foreground">Načítám...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Archiv</h2>

      <div className="flex items-center gap-4">
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
            disabled={batchDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {batchDeleting ? "Mažu..." : `Smazat vybrané (${selected.size})`}
          </Button>
        )}
        <Select value={typeFilter} onValueChange={(val: string | null) => val && setTypeFilter(val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vše</SelectItem>
            {Object.entries(collectionLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Archive} title="Archiv je prázdný" description="Žádné archivované záznamy" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Název</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Archivoval</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-32">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={`${item.collection}-${item.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(`${item.collection}-${item.id}`)}
                      onCheckedChange={() => toggleSelect(`${item.collection}-${item.id}`)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{collectionLabels[item.collection] ?? item.collection}</Badge>
                  </TableCell>
                  <TableCell>{item.deletedBy ?? "—"}</TableCell>
                  <TableCell>{formatDate(item.deletedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(item)}
                        disabled={acting}
                        title="Obnovit"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteTarget(item);
                          setDeleteConfirmName("");
                          setDeleteDialogOpen(true);
                        }}
                        disabled={acting}
                        title="Trvale smazat"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Permanent delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trvale smazat</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Trvale smazaný záznam nelze obnovit. Pokud má navázaná data, mazání bude odmítnuto.
              </p>
              <div className="space-y-2">
                <Label>Pro potvrzení přepište název: <span className="font-medium">{deleteTarget.name}</span></Label>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteTarget.name}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handlePermanentDelete}
                disabled={acting || deleteConfirmName !== deleteTarget.name}
                className="w-full"
              >
                {acting ? "Mažu..." : "Trvale smazat"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
