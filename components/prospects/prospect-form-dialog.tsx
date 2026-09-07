"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategorySelect } from "./category-select";

/** Existující kontakt pro režim editace (podmnožina ProspectRow). */
export interface ProspectEditValues {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  category?: string | null;
  portalUrl?: string | null;
  demoUrl?: string | null;
}

/** Uložené hodnoty předané zpět přes onSuccess (ať volající může sesynchronizovat stav). */
export interface ProspectSavedValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  portalUrl: string;
  demoUrl: string;
}

export function ProspectFormDialog({
  open,
  onOpenChange,
  onSuccess,
  prospect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (saved?: ProspectSavedValues) => void;
  /** Když je předán, dialog edituje existující kontakt (PATCH), jinak vytváří nový (POST). */
  prospect?: ProspectEditValues;
}) {
  const isEdit = !!prospect;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  // Při otevření napln stav (edit = z kontaktu, create = prázdné) — úprava stavu
  // během renderu při přechodu zavřeno→otevřeno (React sanctioned pattern).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(prospect?.name ?? "");
      setCompany(prospect?.company ?? "");
      setEmail(prospect?.email ?? "");
      setPhone(prospect?.phone ?? "");
      setCity(prospect?.city ?? "");
      setCategory(prospect?.category ?? "");
      setPortalUrl(prospect?.portalUrl ?? "");
      setDemoUrl(prospect?.demoUrl ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      const saved: ProspectSavedValues = {
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        category: category.trim(),
        portalUrl: portalUrl.trim(),
        demoUrl: demoUrl.trim(),
      };

      // Edit posílá i prázdné hodnoty (umožní pole vyprázdnit); create prázdné vynechá.
      const body = isEdit
        ? saved
        : {
            name: saved.name,
            company: saved.company || undefined,
            email: saved.email || undefined,
            phone: saved.phone || undefined,
            city: saved.city || undefined,
            category: saved.category || undefined,
            portalUrl: saved.portalUrl || undefined,
            demoUrl: saved.demoUrl || undefined,
          };

      const res = await fetch(
        isEdit ? `/api/prospects/${prospect!.id}` : "/api/prospects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!isEdit && res.status === 409) {
        const data = await res.json();
        toast.error(data.error || "Kontakt již existuje");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }

      toast.success(isEdit ? "Kontakt uložen" : "Kontakt vytvořen");
      if (!isEdit) resetForm();
      onSuccess(saved);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : isEdit
            ? "Nepodařilo se uložit kontakt"
            : "Nepodařilo se vytvořit kontakt"
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setCity("");
    setCategory("");
    setPortalUrl("");
    setDemoUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit kontakt" : "Přidat kontakt"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospect-name">Jméno *</Label>
            <Input
              id="prospect-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-company">Firma</Label>
            <Input
              id="prospect-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospect-email">E-mail</Label>
              <Input
                id="prospect-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect-phone">Telefon</Label>
              <Input
                id="prospect-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospect-city">Město</Label>
              <Input
                id="prospect-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <CategorySelect value={category} onChange={setCategory} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-url">URL profilu</Label>
            <Input
              id="prospect-url"
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-demo">Demo vizitka URL</Label>
            <Input
              id="prospect-demo"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://demo.solopixel.cz/..."
            />
          </div>
          <Button type="submit" disabled={saving || !name.trim()} className="w-full">
            {saving ? "Ukládám..." : isEdit ? "Uložit" : "Vytvořit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
