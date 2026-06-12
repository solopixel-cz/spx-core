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

export function ProspectFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [portalUrl, setPortalUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          portalUrl: portalUrl.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        toast.error(data.error || "Prospekt již existuje");
        return;
      }
      if (!res.ok) throw new Error();

      toast.success("Prospekt vytvořen");
      resetForm();
      onSuccess();
    } catch {
      toast.error("Nepodařilo se vytvořit prospekta");
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
    setPortalUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový prospekt</DialogTitle>
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
          <div className="space-y-2">
            <Label htmlFor="prospect-city">Město</Label>
            <Input
              id="prospect-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
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
          <Button type="submit" disabled={saving || !name.trim()} className="w-full">
            {saving ? "Ukládám..." : "Vytvořit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
