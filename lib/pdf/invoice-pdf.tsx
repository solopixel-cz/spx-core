import path from "path";
import QRCode from "qrcode";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  Svg,
  Rect,
  renderToBuffer,
} from "@react-pdf/renderer";
import { invoiceLineTotal } from "@/lib/schemas/invoice";
import type { CompanyData } from "@/lib/schemas/company";
import { DEFAULT_VAT_NOTE } from "@/lib/schemas/company";
import { buildSpayd, accountToIban } from "@/lib/spayd";

// Roboto podporuje českou diakritiku (standardní PDF Helvetica ne).
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(process.cwd(), "assets/fonts/Roboto-Regular.ttf") },
      {
        src: path.join(process.cwd(), "assets/fonts/Roboto-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // bez dělení slov
  fontsRegistered = true;
}

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface InvoicePdfClient {
  name: string;
  company?: string | null;
  ico?: string | null;
  dic?: string | null;
  billingStreet?: string | null;
  billingZip?: string | null;
  billingCity?: string | null;
}

export interface InvoicePdfData {
  number: string;
  amount: number;
  items: InvoicePdfItem[];
  variableSymbol?: string | null;
  note?: string | null;
  issuedAt: Date | null;
  dueAt: Date | null;
}

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const date = (d: Date | null) => (d ? d.toLocaleDateString("cs-CZ") : "—");

/** SoloPixel brand paleta (dle solopixel.cz / app theme). */
const BRAND = {
  ink: "#0f172a", // slate-900 — text a logo
  teal: "#0d9488", // teal-600 — akcent (dobrý kontrast na bílé)
  mint: "#5eead4", // mint — pixel v logu
  mintTint: "#f0fdfa", // teal-50 — podklad souhrnu
  muted: "#64748b", // slate-500
  faint: "#94a3b8", // slate-400 — labely
  border: "#e2e8f0", // slate-200
  borderStrong: "#cbd5e1", // slate-300
};

/**
 * Pixel symbol z loga SoloPixel — 3×3 mřížka s prázdným středem,
 * pravý horní čtverec mint, zbytek tmavý (ink).
 */
function PixelLogo({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Rect x="0" y="0" width="10" height="10" fill={BRAND.ink} />
      <Rect x="10" y="0" width="10" height="10" fill={BRAND.ink} />
      <Rect x="20" y="0" width="10" height="10" fill={BRAND.mint} />
      <Rect x="0" y="10" width="10" height="10" fill={BRAND.ink} />
      <Rect x="20" y="10" width="10" height="10" fill={BRAND.ink} />
      <Rect x="0" y="20" width="10" height="10" fill={BRAND.ink} />
      <Rect x="10" y="20" width="10" height="10" fill={BRAND.ink} />
      <Rect x="20" y="20" width="10" height="10" fill={BRAND.ink} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    color: BRAND.ink,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 44,
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { flexDirection: "row", alignItems: "center" },
  headerRight: { alignItems: "flex-end" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 1.15,
  },
  titleNumber: {
    color: BRAND.teal,
    fontWeight: "bold",
    lineHeight: 1,
    marginTop: 3,
  },
  accentRule: {
    height: 3,
    backgroundColor: BRAND.teal,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 24,
  },
  muted: { color: BRAND.muted },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  party: { width: "48%" },
  partyLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: BRAND.teal,
    marginBottom: 4,
  },
  partyName: { fontWeight: "bold", marginBottom: 2 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 20 },
  metaItem: {},
  metaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: BRAND.faint,
  },
  metaValue: { fontWeight: "bold", marginTop: 2 },
  table: { marginTop: 8 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND.ink,
    paddingBottom: 6,
    marginBottom: 2,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
    paddingVertical: 6,
  },
  th: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: BRAND.muted,
  },
  cDesc: { width: "46%" },
  cQty: { width: "12%", textAlign: "right" },
  cPrice: { width: "18%", textAlign: "right" },
  cDisc: { width: "10%", textAlign: "right" },
  cTotal: { width: "14%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  totalBox: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    backgroundColor: BRAND.mintTint,
    borderWidth: 1,
    borderColor: BRAND.mint,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  totalLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: BRAND.teal,
    lineHeight: 1,
  },
  totalValue: { fontSize: 16, fontWeight: "bold", color: BRAND.ink, lineHeight: 1 },
  payRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  payInfo: { width: "62%" },
  qrBox: { width: "34%", alignItems: "center" },
  qrImg: { width: 110, height: 110 },
  qrCaption: { fontSize: 8, color: BRAND.faint, marginTop: 4 },
  note: { marginTop: 20 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    fontSize: 8,
    color: BRAND.faint,
    textAlign: "center",
    borderTopWidth: 2,
    borderTopColor: BRAND.mint,
    paddingTop: 8,
  },
});

function clientAddressLines(c: InvoicePdfClient): string[] {
  const lines: string[] = [];
  if (c.company) lines.push(c.company);
  if (c.billingStreet) lines.push(c.billingStreet);
  const cityLine = [c.billingZip, c.billingCity].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines;
}

function InvoiceDocument({
  invoice,
  company,
  client,
  qrDataUrl,
}: {
  invoice: InvoicePdfData;
  company: CompanyData;
  client: InvoicePdfClient;
  qrDataUrl: string | null;
}) {
  const vatNote = company.vatNote || DEFAULT_VAT_NOTE;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hlavička */}
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <PixelLogo size={28} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Faktura</Text>
            <Text style={styles.titleNumber}>č. {invoice.number}</Text>
          </View>
        </View>
        <View style={styles.accentRule} />

        {/* Dodavatel / Odběratel */}
        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Dodavatel</Text>
            <Text style={styles.partyName}>{company.name}</Text>
            {company.address
              .split(/\n+/)
              .filter(Boolean)
              .map((l, i) => (
                <Text key={i}>{l}</Text>
              ))}
            {company.ico ? <Text>IČO: {company.ico}</Text> : null}
            {company.dic ? <Text>DIČ: {company.dic}</Text> : null}
            <Text style={styles.muted}>{vatNote}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Odběratel</Text>
            <Text style={styles.partyName}>{client.name}</Text>
            {clientAddressLines(client).map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}
            {client.ico ? <Text>IČO: {client.ico}</Text> : null}
            {client.dic ? <Text>DIČ: {client.dic}</Text> : null}
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Datum vystavení</Text>
            <Text style={styles.metaValue}>{date(invoice.issuedAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Datum splatnosti</Text>
            <Text style={styles.metaValue}>{date(invoice.dueAt)}</Text>
          </View>
          {invoice.variableSymbol ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Variabilní symbol</Text>
              <Text style={styles.metaValue}>{invoice.variableSymbol}</Text>
            </View>
          ) : null}
        </View>

        {/* Položky */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.cDesc]}>Popis</Text>
            <Text style={[styles.th, styles.cQty]}>Ks</Text>
            <Text style={[styles.th, styles.cPrice]}>Cena/ks</Text>
            <Text style={[styles.th, styles.cDisc]}>Sleva</Text>
            <Text style={[styles.th, styles.cTotal]}>Celkem</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={i} style={styles.tr}>
              <Text style={styles.cDesc}>{it.description}</Text>
              <Text style={styles.cQty}>{it.quantity}</Text>
              <Text style={styles.cPrice}>{czk(it.unitPrice)}</Text>
              <Text style={styles.cDisc}>
                {it.discountPercent ? `${it.discountPercent} %` : "—"}
              </Text>
              <Text style={styles.cTotal}>{czk(invoiceLineTotal(it))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Celkem k úhradě</Text>
            <Text style={styles.totalValue}>{czk(invoice.amount)}</Text>
          </View>
        </View>

        {/* Platba + QR */}
        <View style={styles.payRow}>
          <View style={styles.payInfo}>
            <Text style={styles.partyLabel}>Platební údaje</Text>
            <Text>Číslo účtu: {company.bankAccount}</Text>
            {invoice.variableSymbol ? (
              <Text>Variabilní symbol: {invoice.variableSymbol}</Text>
            ) : null}
            <Text>Částka: {czk(invoice.amount)}</Text>
            <Text style={styles.muted}>{vatNote}</Text>
          </View>
          {qrDataUrl ? (
            <View style={styles.qrBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qrImg} />
              <Text style={styles.qrCaption}>QR platba</Text>
            </View>
          ) : null}
        </View>

        {invoice.note ? (
          <View style={styles.note}>
            <Text style={styles.partyLabel}>Poznámka</Text>
            <Text>{invoice.note}</Text>
          </View>
        ) : null}

        {company.invoiceFooter ? (
          <Text style={styles.footer} fixed>
            {company.invoiceFooter}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}

/**
 * Sestaví SPAYD a vrátí QR jako PNG data URI (nebo null, když chybí účet/IBAN).
 */
export async function invoiceQrDataUrl(
  invoice: InvoicePdfData,
  company: CompanyData
): Promise<string | null> {
  const iban = (company.iban && company.iban.trim()) || accountToIban(company.bankAccount);
  if (!iban) return null;
  const spayd = buildSpayd({
    iban,
    amount: invoice.amount,
    variableSymbol: invoice.variableSymbol ?? undefined,
    message: `Faktura ${invoice.number}`,
  });
  return QRCode.toDataURL(spayd, { margin: 1, width: 220 });
}

/** Vyrenderuje fakturu do PDF bufferu. */
export async function renderInvoicePdf(params: {
  invoice: InvoicePdfData;
  company: CompanyData;
  client: InvoicePdfClient;
}): Promise<Buffer> {
  ensureFonts();
  const qrDataUrl = await invoiceQrDataUrl(params.invoice, params.company).catch(
    () => null
  );
  return renderToBuffer(
    <InvoiceDocument
      invoice={params.invoice}
      company={params.company}
      client={params.client}
      qrDataUrl={qrDataUrl}
    />
  );
}
