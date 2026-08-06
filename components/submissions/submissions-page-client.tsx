"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSubmissionPrompt } from "@/lib/submission-prompt";
import {
  type SubmissionView,
  MAIN_ACTION_LABELS,
  TONE_LABELS,
  ADDRESS_LABELS,
  label,
  domainLabel,
} from "@/lib/submission-view-model";

interface Submission extends SubmissionView {
  id: string;
  clientId?: string;
  clientName?: string;
  createdAt: string | null;
  processedAt: string | null;
  processedBy?: string;
}

export function SubmissionsPageClient() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) setSubmissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleProcess(id: string) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success("Podklady označeny jako zpracované");
      setSelected(null);
      fetchData();
      router.refresh();
    } catch {
      toast.error("Nepodařilo se označit jako zpracované");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Podklady</h1>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Podklady</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Odesláno</TableHead>
              <TableHead>Stav</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Žádné podklady
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(s)}
                >
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    {s.clientName ? (
                      <Link
                        href={`/klienti/${s.clientId}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.clientName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString("cs-CZ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.processedAt ? "secondary" : "default"}>
                      {s.processedAt ? "Zpracováno" : "Nové"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between">
                <SheetTitle>{selected.fullName}</SheetTitle>
                <Badge variant={selected.processedAt ? "secondary" : "default"}>
                  {selected.processedAt ? "Zpracováno" : "Nové"}
                </Badge>
              </div>

              {selected.profileImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.profileImageUrl}
                  alt="Profilová fotka"
                  className="h-32 w-32 rounded-lg object-cover"
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    if (!navigator.clipboard) {
                      toast.error("Kopírování není dostupné (nezabezpečený kontext)");
                      return;
                    }
                    await navigator.clipboard.writeText(buildSubmissionPrompt(selected));
                    toast.success("Podklady zkopírovány pro AI");
                  } catch {
                    toast.error("Nepodařilo se zkopírovat");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Kopírovat pro AI
              </Button>

              {selected.clientName && (
                <div>
                  <span className="text-sm text-muted-foreground">Klient: </span>
                  <Link href={`/klienti/${selected.clientId}`} className="text-sm hover:underline">
                    {selected.clientName}
                  </Link>
                </div>
              )}

              <Section
                title="Kontakt"
                show={has(
                  selected.phone,
                  selected.email,
                  selected.companyBrand,
                  selected.region,
                  selected.customDomain,
                  selected.ico
                )}
              >
                <Field label="Telefon" value={selected.phone} />
                <Field label="E-mail" value={selected.email} />
                <Field label="Firma / značka" value={selected.companyBrand} />
                <Field label="Region" value={selected.region} />
                <Field label={domainLabel(selected.hasDomain)} value={selected.customDomain} />
                <Field label="IČO" value={selected.ico} />
              </Section>

              <Section
                title="Sociální sítě"
                show={has(
                  selected.youtube,
                  selected.instagram,
                  selected.tiktok,
                  selected.facebook,
                  selected.customSocial.some((c) => c.nazev || c.odkaz)
                )}
              >
                <Field label="YouTube" value={selected.youtube} />
                <Field label="Instagram" value={selected.instagram} />
                <Field label="TikTok" value={selected.tiktok} />
                <Field label="Facebook" value={selected.facebook} />
                {selected.customSocial
                  .filter((c) => c.nazev || c.odkaz)
                  .map((c, i) => (
                    <Field key={i} label={c.nazev || "Odkaz"} value={c.odkaz} />
                  ))}
              </Section>

              <Section
                title="Co dělá"
                show={has(
                  selected.whatIDo,
                  selected.topServices,
                  selected.mainAction
                )}
              >
                <TextBlock label="Čím se živí" value={selected.whatIDo} />
                <TextBlock label="Hlavní 3 služby" value={selected.topServices} />
                <Field
                  label="Hlavní akce"
                  value={joinHint(
                    label(MAIN_ACTION_LABELS, selected.mainAction),
                    selected.mainActionNote
                  )}
                />
              </Section>

              <Section title="O mně" show={has(selected.aboutText)}>
                <TextBlock value={selected.aboutText} />
              </Section>

              <Section
                title="Pixela"
                show={has(selected.tone, selected.address, selected.ownWords)}
              >
                <Field label="Tón" value={label(TONE_LABELS, selected.tone)} />
                <Field label="Oslovení" value={label(ADDRESS_LABELS, selected.address)} />
                <TextBlock label="Vlastními slovy" value={selected.ownWords} />
              </Section>

              {/* Poznámky — jen legacy záznamy (v2 sekci nemá) */}
              <Section title="Poznámky" show={has(selected.notes)}>
                <TextBlock value={selected.notes} />
              </Section>

              {!selected.processedAt && (
                <>
                  <Separator />
                  <Button
                    onClick={() => handleProcess(selected.id)}
                    className="w-full"
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {processing ? "Označuji..." : "Označit zpracované"}
                  </Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** True, pokud má sekce aspoň jednu vyplněnou hodnotu. */
function has(...values: (string | boolean | undefined)[]): boolean {
  return values.some(Boolean);
}

/** Spojí čitelný text s volitelnou poznámkou v závorce. */
function joinHint(value?: string, note?: string): string | undefined {
  if (!value) return undefined;
  return note ? `${value} (${note})` : value;
}

function Section({
  title,
  show = true,
  children,
}: {
  title: string;
  show?: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <dl className="space-y-1 text-sm">{children}</dl>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right break-words">{value}</dd>
    </div>
  );
}

/** Víceřádkové / dlouhé pole — popisek nad hodnotou, zachovává odřádkování. */
function TextBlock({ label, value }: { label?: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      {label && <dt className="text-muted-foreground">{label}</dt>}
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
