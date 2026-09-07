"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Save, Trash2 } from "lucide-react";

export interface EmailTemplateData {
  id: string;
  name: string;
  subject: string | null;
  html: string;
}

const DEFAULT_HTML = `<!doctype html>
<html lang="cs">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Nadpis</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                  Text e-mailu…
                </p>
                <a href="https://solopixel.cz" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;">
                  Tlačítko
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export function TemplateEditorClient({
  template,
}: {
  /** Když je předán, jde o editaci; jinak vytváření nové šablony. */
  template?: EmailTemplateData;
}) {
  const router = useRouter();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [html, setHtml] = useState(template?.html ?? DEFAULT_HTML);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Vyplňte název šablony");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), subject: subject.trim(), html };
      const res = await fetch(
        isEdit ? `/api/email-templates/${template!.id}` : "/api/email-templates",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast.success(isEdit ? "Šablona uložena" : "Šablona vytvořena");
      if (isEdit) {
        router.refresh();
      } else {
        const data = await res.json();
        router.push(`/email-marketing/${data.id}`);
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Nepodařilo se uložit");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Smazat tuto šablonu?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email-templates/${template!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Šablona smazána");
      router.push("/email-marketing");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se smazat");
    } finally {
      setDeleting(false);
    }
  }

  const title = isEdit ? template!.name : "Nová šablona";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Email marketing", href: "/email-marketing" },
          { label: title },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton href="/email-marketing" className="shrink-0" />
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
            {title}
          </h1>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" onClick={handleDelete} disabled={deleting || saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Smazat
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || deleting || !name.trim()}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Ukládám..." : "Uložit"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Název šablony *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Novoroční newsletter"
            />
            <p className="text-xs text-muted-foreground">
              Interní název — v seznamu, ne v e-mailu.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-subject">Předmět e-mailu</Label>
            <Input
              id="tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Předmět, který uvidí příjemce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-html">HTML</Label>
            <Textarea
              id="tpl-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              rows={22}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Vlastní HTML šablony. Náhled vpravo se aktualizuje živě.
            </p>
          </div>
        </div>

        {/* Živý náhled */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs md:p-6 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Náhled
          </p>
          <div className="overflow-hidden rounded border bg-[#f1f5f9]">
            <iframe
              srcDoc={html}
              sandbox=""
              className="h-[70vh] w-full border-0 lg:h-[calc(100vh-12rem)]"
              title="Náhled e-mailu"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
