"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { buildSubmissionPrompt } from "@/lib/submission-prompt";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type SubmissionView,
  MAIN_ACTION_LABELS,
  MAIN_ACTION_HINTS,
  TONE_LABELS,
  TONE_HINTS,
  ADDRESS_LABELS,
  label,
} from "@/lib/submission-view-model";

export interface SubmissionDetail extends SubmissionView {
  id: string;
  clientId?: string;
  clientName?: string;
  createdAt: string | null;
  processedAt: string | null;
  processedByName?: string;
}

/** Doporučená délka textu „O mně" (z formuláře, jen doporučení). */
const ABOUT_RECOMMENDED = 500;

export function SubmissionDetailClient({ submission: s }: { submission: SubmissionDetail }) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  async function handleProcess() {
    setProcessing(true);
    try {
      const res = await fetch(`/api/submissions/${s.id}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success("Podklady označeny jako zpracované");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se označit jako zpracované");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCopy() {
    try {
      if (!navigator.clipboard) {
        toast.error("Kopírování není dostupné (nezabezpečený kontext)");
        return;
      }
      await navigator.clipboard.writeText(buildSubmissionPrompt(s));
      // Potvrzení přímo na tlačítku, po chvíli se vrátí do původního stavu.
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nepodařilo se zkopírovat");
    }
  }

  const name = s.fullName || "Bez jména";
  const customSocial = s.customSocial.filter((c) => c.nazev || c.odkaz);
  const aboutLength = s.aboutText?.trim().length ?? 0;

  // Povinná pole formuláře (v2) — co chybí, je potřeba doptat.
  const required: [string, string | undefined][] = [
    ["Jméno", s.fullName],
    ["Telefon", s.phone],
    ["E-mail", s.email],
    ["Doména", s.customDomain],
    ["Čím se živí", s.whatIDo],
    ["Hlavní služby", s.topServices],
    ["O mně", s.aboutText],
  ];
  const missingRequired = required.filter(([, v]) => !v).map(([l]) => l);
  // Doporučené — vizitka bez nich funguje, ale je chudší.
  const recommended: [string, boolean][] = [
    ["Profilová fotka", !!s.profileImageUrl],
    ["Firma / značka", !!s.companyBrand],
    ["Region", !!s.region],
    ["Aspoň jedna sociální síť", !!(s.youtube || s.instagram || s.tiktok || s.facebook || customSocial.length)],
    [`O mně aspoň ${ABOUT_RECOMMENDED} znaků`, aboutLength >= ABOUT_RECOMMENDED],
  ];
  const missingRecommended = recommended.filter(([, ok]) => !ok).map(([l]) => l);

  return (
    <div className="space-y-6">
      <Breadcrumbs backHref="/submissions" items={[{ label: "Podklady", href: "/submissions" }, { label: name }]} />

      {/* Hero — kdo, stav, kontakty, akce */}
      <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          {s.profileImageUrl ? (
            <a href={s.profileImageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Otevřít fotku v plné velikosti">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.profileImageUrl}
                alt="Profilová fotka"
                className="size-14 rounded-full object-cover md:size-16"
              />
            </a>
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary md:size-16">
              <User className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{name}</h1>
              <Badge variant={s.processedAt ? "secondary" : "default"}>
                {s.processedAt ? "Zpracováno" : "Nové"}
              </Badge>
              {s.legacy && <Badge variant="outline">Starší formulář</Badge>}
            </div>
            {s.companyBrand && (
              <p className="mt-0.5 text-sm text-muted-foreground md:text-base">{s.companyBrand}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Odesláno {formatDateTime(s.createdAt)}
              {s.processedAt && (
                <>
                  {" · "}Zpracováno {formatDate(s.processedAt)}
                  {s.processedByName && ` (${s.processedByName})`}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {s.email && (
            <Chip href={`mailto:${s.email}`} icon={<Mail className="h-3.5 w-3.5 shrink-0" />}>
              {s.email}
            </Chip>
          )}
          {s.phone && (
            <Chip href={`tel:${s.phone.replace(/\s/g, "")}`} icon={<Phone className="h-3.5 w-3.5 shrink-0" />}>
              {s.phone}
            </Chip>
          )}
          {s.hasDomain === "ano" && s.customDomain && toUrl(s.customDomain) && (
            <Chip href={toUrl(s.customDomain)!} icon={<Globe className="h-3.5 w-3.5 shrink-0" />}>
              {s.customDomain}
            </Chip>
          )}
          {s.clientId && s.clientName && (
            <Chip href={`/clients/${s.clientId}`} icon={<User className="h-3.5 w-3.5 shrink-0" />}>
              Klient: {s.clientName}
            </Chip>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleCopy} aria-live="polite">
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Zkopírováno" : "Kopírovat pro AI"}
          </Button>
          {!s.processedAt && (
            <Button size="sm" onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {processing ? "Označuji..." : "Označit zpracované"}
            </Button>
          )}
        </div>
      </div>

      {/* Přehled vyplnění — co chybí na první pohled */}
      {!s.legacy && (
        <div
          className={cn(
            "rounded-2xl border p-4 text-sm",
            missingRequired.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
              : "bg-card"
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            {missingRequired.length > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {missingRequired.length > 0
              ? `Chybí povinné: ${missingRequired.join(", ")}`
              : `Všechna povinná pole vyplněna (${required.length}/${required.length})`}
          </div>
          {missingRecommended.length > 0 ? (
            <p className="mt-1 text-muted-foreground">
              Doporučené, ale chybí: {missingRecommended.join(", ")}. Vizitka bez nich funguje, jen bude chudší.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Vyplněno i vše doporučené.</p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Základní údaje"
          intro="Hlavička vizitky a kontakty, přes které se návštěvník ozve."
        >
          <FieldRow label="Jméno a příjmení" hint="Z pozvánky, klient ho neměnil. Hlavní titulek vizitky." value={s.fullName} required />
          <FieldRow label="Telefon" hint="Tlačítko Zavolat a kontakt na vizitce." value={s.phone} required />
          <FieldRow label="E-mail" hint="Z pozvánky. Kontakt na vizitce a adresa, kam chodí poptávky." value={s.email} required />
          <FieldRow label="Firma / značka" hint="Zobrazí se pod jménem (např. ZFP, OVB)." value={s.companyBrand} />
          <FieldRow
            label={s.hasDomain === "ne" ? "Doména (přání)" : "Doména"}
            hint={
              s.hasDomain === "ano"
                ? "Klient doménu už má. Vizitku na ni napojíme (DNS)."
                : s.hasDomain === "ne"
                  ? "Klient doménu nemá, tohle je přání. Ověřit dostupnost a koupit."
                  : "Adresa, na které vizitka poběží."
            }
            value={s.customDomain}
            required
          />
          <FieldRow label="Region působení" hint="Kde klient působí. Do textů a pro Pixelu (místní dotazy)." value={s.region} />
          <FieldRow
            label="Profilová fotka"
            hint="Fotka do hlavičky vizitky. Klik otevře plnou velikost."
            value={s.profileImageUrl ? "Nahraná" : undefined}
            href={s.profileImageUrl}
          />
        </SectionCard>

        <SectionCard title="Sociální sítě" intro="Ikony odkazů na vizitce. Co klient nevyplnil, na vizitce nebude.">
          <FieldRow label="YouTube" value={s.youtube} link />
          <FieldRow label="Instagram" value={s.instagram} link />
          <FieldRow label="TikTok" value={s.tiktok} link />
          <FieldRow label="Facebook" value={s.facebook} link />
          {customSocial.map((c, i) => (
            <FieldRow key={i} label={c.nazev || "Další síť"} hint="Síť přidaná klientem." value={c.odkaz} link />
          ))}
        </SectionCard>

        <SectionCard title="Co dělá" intro="Obsah hlavní části vizitky: kdo klient je, co nabízí a co má návštěvník udělat.">
          <FieldRow label="Čím se živí" hint="Jedna věta. Základ podtitulku vizitky." value={s.whatIDo} required block />
          <FieldRow label="3 hlavní služby" hint="Z nich vzniknou karty služeb." value={s.topServices} required block />
          <FieldRow
            label="Co má návštěvník udělat"
            hint={s.mainAction ? MAIN_ACTION_HINTS[s.mainAction] : "Určuje hlavní tlačítko vizitky."}
            value={
              label(MAIN_ACTION_LABELS, s.mainAction) &&
              `${label(MAIN_ACTION_LABELS, s.mainAction)}${s.mainActionNote ? ` (${s.mainActionNote})` : ""}`
            }
          />
          {s.pricing && <FieldRow label="Ceník (orientačně od)" value={s.pricing} block />}
        </SectionCard>

        <SectionCard
          title="Jak má působit Pixela"
          intro="Pixela je AI asistentka na vizitce. Odpovídá návštěvníkům za klienta, tady je její styl."
        >
          <FieldRow
            label="Tón"
            hint={s.tone ? `Hodí se pro: ${TONE_HINTS[s.tone] ?? "?"}` : undefined}
            value={label(TONE_LABELS, s.tone)}
          />
          <FieldRow label="Oslovení návštěvníků" hint="Jestli Pixela vyká, nebo tyká." value={label(ADDRESS_LABELS, s.address)} />
          <FieldRow label="Vlastními slovy" hint="Jak klient sám popisuje svůj styl. Nepovinné." value={s.ownWords} block />
        </SectionCard>

        {/* O mně — nejdůležitější text, přes celou šířku */}
        <SectionCard
          title="O mně"
          intro="Nejdůležitější část. Z ní píšeme sekci O mně a učíme Pixelu, jak klient mluví."
          className="lg:col-span-2"
          aside={
            s.aboutText ? (
              <span
                className={cn(
                  "text-xs",
                  aboutLength >= ABOUT_RECOMMENDED ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"
                )}
              >
                {aboutLength} znaků · doporučeno aspoň {ABOUT_RECOMMENDED}
              </span>
            ) : undefined
          }
        >
          {s.aboutText ? (
            <p className="whitespace-pre-wrap leading-relaxed">{s.aboutText}</p>
          ) : (
            <Missing required />
          )}
        </SectionCard>

        {(s.appearanceColors || s.appearanceNotes) && (
          <SectionCard title="Vzhled a poznámky" intro="Přání ke vzhledu a cokoli dalšího, co bychom měli vědět." className="lg:col-span-2">
            <FieldRow label="Barvy / styl" value={s.appearanceColors} />
            <FieldRow label="Další poznámky" value={s.appearanceNotes} block />
          </SectionCard>
        )}

        {s.notes && (
          <SectionCard
            title="Další údaje ze staršího formuláře"
            intro="Pole, která nový formulář už nemá. Zachovaná, ať se nic neztratí."
            className="lg:col-span-2"
          >
            <p className="whitespace-pre-wrap">{s.notes}</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  intro,
  aside,
  className,
  children,
}: {
  title: string;
  intro?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-xs md:p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {intro && <p className="mt-0.5 text-sm text-muted-foreground">{intro}</p>}
      <dl className="mt-4 space-y-3 text-sm">{children}</dl>
    </section>
  );
}

/**
 * Jedno pole formuláře: popisek + vysvětlivka (k čemu slouží) + hodnota.
 * Prázdné pole zůstává vidět jako „Nevyplněno" (povinné jako „Chybí"),
 * ať je jasné, co klient nedodal.
 */
function FieldRow({
  label: labelText,
  hint,
  value,
  required,
  block,
  link,
  href,
}: {
  label: string;
  hint?: string;
  value?: string;
  required?: boolean;
  /** Víceřádkový text — hodnota pod popiskem, se zachovaným odřádkováním. */
  block?: boolean;
  /** Hodnota je odkaz (URL nebo @handle). */
  link?: boolean;
  href?: string;
}) {
  const url = href ?? (link && value ? toUrl(value) : undefined);
  const content = !value ? (
    <Missing required={required} />
  ) : url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 break-all hover:underline">
      {value}
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
    </a>
  ) : (
    <span className={cn(block && "whitespace-pre-wrap", "break-words")}>{value}</span>
  );

  return (
    <div className={cn(block ? "space-y-1" : "grid gap-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4")}>
      <dt>
        <span className="text-muted-foreground">{labelText}</span>
        {hint && <span className="block text-xs text-muted-foreground/70">{hint}</span>}
      </dt>
      <dd className="min-w-0">{content}</dd>
    </div>
  );
}

function Missing({ required }: { required?: boolean }) {
  return required ? (
    <span className="text-amber-600 dark:text-amber-400">Chybí (povinné)</span>
  ) : (
    <span className="italic text-muted-foreground/70">Nevyplněno</span>
  );
}

/** Odkaz ze sociální sítě: URL nechá, doménu doplní o https. Handle bez domény odkazem není. */
function toUrl(value: string): string | undefined {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) return `https://${v}`;
  return undefined;
}

/** Kontaktní pill chip (jako v detailu klienta). */
function Chip({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted";
  const inner = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

