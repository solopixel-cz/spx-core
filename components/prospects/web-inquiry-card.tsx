import { ExternalLink } from "lucide-react";
import { DIRECT_SOURCE, sourceLabel, type Attribution } from "@/lib/attribution";

export interface WebInquiry {
  industry: string | null;
  product: string | null;
  plan: string | null;
  teamType: string | null;
  teamSize: string | null;
  link: string | null;
  message: string | null;
  note: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

/** Odkaz z formuláře bývá bez protokolu („instagram.com/jana"). */
function linkHref(link: string) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

/**
 * Poptávka z webu na detailu kontaktu: co klient vyplnil ve formuláři a odkud
 * na web přišel (UTM kampaň, referrer, první stránka).
 */
export function WebInquiryCard({
  inquiry,
  attribution,
}: {
  inquiry: WebInquiry | null;
  attribution: Attribution | null;
}) {
  if (!inquiry && !attribution) return null;
  const a = attribution;
  const direct = !a || (!a.utmSource && !a.referrer) || a.utmSource === DIRECT_SOURCE;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Poptávka z webu
      </p>

      {inquiry && (
        <dl className="space-y-2 text-sm">
          {inquiry.industry && <Row label="Obor">{inquiry.industry}</Row>}
          {inquiry.product && <Row label="Produkt">{inquiry.product}</Row>}
          {inquiry.plan && <Row label="Plán">{inquiry.plan}</Row>}
          {inquiry.teamType && (
            <Row label="Režim">
              {inquiry.teamType === "team" ? "Tým" : "Sólo"}
              {inquiry.teamSize ? ` (${inquiry.teamSize})` : ""}
            </Row>
          )}
          {inquiry.link && (
            <Row label="Kde ho najdeme">
              <a
                href={linkHref(inquiry.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {inquiry.link}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </Row>
          )}
        </dl>
      )}

      {inquiry?.message && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Zpráva</p>
          <p className="whitespace-pre-wrap text-sm">{inquiry.message}</p>
        </div>
      )}
      {inquiry?.note && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Poznámka od klienta</p>
          <p className="whitespace-pre-wrap text-sm">{inquiry.note}</p>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Zdroj</p>
        <dl className="space-y-2 text-sm">
          {a?.utmCampaign && <Row label="Kampaň">{a.utmCampaign}</Row>}
          <Row label="Zdroj / médium">
            {direct && !a?.utmMedium
              ? sourceLabel(DIRECT_SOURCE)
              : [a?.utmSource, a?.utmMedium].filter(Boolean).join(" / ")}
          </Row>
          {a?.utmContent && <Row label="Varianta">{a.utmContent}</Row>}
          {a?.referrer && <Row label="Přišel z">{a.referrer}</Row>}
          {a?.landingPage && <Row label="První stránka">{a.landingPage}</Row>}
        </dl>
      </div>
    </div>
  );
}
