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

interface Submission {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  companyId?: string;
  companyName?: string;
  officeAddress?: string;
  specialization?: string;
  city?: string;
  primaryLanguage?: string;
  availableLanguages: string[];
  customDomain?: string;
  reasons: string[];
  cnbExams: string[];
  bio?: string;
  yearsOfExperience?: number;
  clientCount?: number;
  focusAreas: string[];
  clientTypes: string[];
  whatsapp?: string;
  motto?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  website?: string;
  referenceUrl?: string;
  wantsCareerTab?: boolean;
  profileImageUrl?: string;
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

              <Separator />
              <Section title="Kontakt">
                <Field label="E-mail" value={selected.email} />
                <Field label="Telefon" value={selected.phone} />
                <Field label="WhatsApp" value={selected.whatsapp} />
                <Field label="Společnost" value={selected.companyName} />
                <Field label="IČO" value={selected.companyId} />
                <Field label="Adresa" value={selected.officeAddress} />
                <Field label="Město" value={selected.city} />
              </Section>

              <Separator />
              <Section title="Profese">
                <Field label="Specializace" value={selected.specialization} />
                <Field label="Praxe (roky)" value={selected.yearsOfExperience?.toString()} />
                <Field label="Počet klientů" value={selected.clientCount?.toString()} />
                <Field label="ČNB zkoušky" value={selected.cnbExams.join(", ")} />
                <Field label="Zaměření" value={selected.focusAreas.join(", ")} />
                <Field label="Typy klientů" value={selected.clientTypes.join(", ")} />
                <Field label="Zájem o Spolupráci" value={selected.wantsCareerTab ? "Ano" : undefined} />
              </Section>

              <Separator />
              <Section title="Profil">
                <Field label="Motto" value={selected.motto} />
                <Field label="Bio" value={selected.bio} />
                <Field label="Důvody" value={selected.reasons.join("; ")} />
                <Field label="Jazyk" value={selected.primaryLanguage} />
                <Field label="Další jazyky" value={selected.availableLanguages.join(", ")} />
              </Section>

              <Separator />
              <Section title="Sociální sítě a reference">
                <Field label="Instagram" value={selected.instagram} />
                <Field label="LinkedIn" value={selected.linkedin} />
                <Field label="Facebook" value={selected.facebook} />
                <Field label="Web" value={selected.website} />
                <Field label="Reference" value={selected.referenceUrl} />
              </Section>

              <Separator />
              <Section title="Vizitka">
                <Field label="Vlastní doména" value={selected.customDomain} />
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <dl className="space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right max-w-[60%]">{value}</dd>
    </div>
  );
}
