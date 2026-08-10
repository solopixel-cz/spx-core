/**
 * Fakturoid API v3 klient (OAuth 2.0 Client Credentials Flow).
 *
 * Fakturoid je „účetní pravda": CRM sem posílá faktury (manuálně, fáze 31C),
 * Fakturoid generuje PDF a — protože má napojenou ČSOB — drží stav zaplacení,
 * který si CRM synchronizuje cronem (fáze 31D).
 *
 * Vše je „dormant" dokud nejsou nastavené env proměnné:
 *   FAKTUROID_SLUG, FAKTUROID_CLIENT_ID, FAKTUROID_CLIENT_SECRET
 *   FAKTUROID_USER_AGENT (volitelné, default "SPX Core (apps@solopixel.cz)")
 */

const API_BASE = "https://app.fakturoid.cz/api/v3";

function userAgent(): string {
  return process.env.FAKTUROID_USER_AGENT || "SPX Core (apps@solopixel.cz)";
}

export function isFakturoidConfigured(): boolean {
  return Boolean(
    process.env.FAKTUROID_SLUG &&
      process.env.FAKTUROID_CLIENT_ID &&
      process.env.FAKTUROID_CLIENT_SECRET
  );
}

function accountBase(): string {
  return `${API_BASE}/accounts/${process.env.FAKTUROID_SLUG}`;
}

// Token cache (access token platí 2 h).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  const clientId = process.env.FAKTUROID_CLIENT_ID!;
  const clientSecret = process.env.FAKTUROID_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": userAgent(),
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  if (!res.ok) {
    throw new Error(`Fakturoid auth selhalo (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function fk(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  return fetch(`${accountBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": userAgent(),
      ...(init.headers ?? {}),
    },
  });
}

export interface FakturoidLine {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
}

/**
 * Najde subjekt (odběratele) podle `custom_id` (= clientId v CRM) nebo ho vytvoří.
 * Vrací Fakturoid subject id.
 */
export async function findOrCreateSubject(params: {
  customId: string;
  name: string;
  email?: string | null;
}): Promise<number> {
  const found = await fk(
    `/subjects.json?custom_id=${encodeURIComponent(params.customId)}`
  );
  if (found.ok) {
    const list = (await found.json()) as { id: number }[];
    if (Array.isArray(list) && list.length > 0) return list[0].id;
  }

  const created = await fk(`/subjects.json`, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      email: params.email || undefined,
      custom_id: params.customId,
    }),
  });
  if (!created.ok) {
    throw new Error(`Fakturoid: vytvoření odběratele selhalo (${created.status})`);
  }
  const subject = (await created.json()) as { id: number };
  return subject.id;
}

export interface FakturoidInvoiceResult {
  id: number;
  number: string;
  status: string;
  variableSymbol: string | null;
}

export async function createInvoice(params: {
  subjectId: number;
  lines: FakturoidLine[];
  dueDays: number;
  /** Nepovinné — když se nepošle, Fakturoid VS dopočítá sám (varianta B). */
  variableSymbol?: string;
  note?: string | null;
}): Promise<FakturoidInvoiceResult> {
  const res = await fk(`/invoices.json`, {
    method: "POST",
    body: JSON.stringify({
      subject_id: params.subjectId,
      lines: params.lines,
      due: params.dueDays,
      variable_symbol: params.variableSymbol,
      note: params.note || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fakturoid: vytvoření faktury selhalo (${res.status}) ${body}`);
  }
  const data = (await res.json()) as {
    id: number;
    number: string;
    status: string;
    variable_symbol?: string | null;
  };
  return {
    id: data.id,
    number: data.number,
    status: data.status,
    variableSymbol: data.variable_symbol ?? null,
  };
}

export async function getInvoice(
  id: number | string
): Promise<{ status: string; paid_on: string | null }> {
  const res = await fk(`/invoices/${id}.json`);
  if (!res.ok) {
    throw new Error(`Fakturoid: načtení faktury selhalo (${res.status})`);
  }
  const data = (await res.json()) as { status: string; paid_on: string | null };
  return { status: data.status, paid_on: data.paid_on ?? null };
}

/**
 * Stáhne PDF faktury. PDF se generuje asynchronně — na 204 se chvíli počká
 * a zkusí znovu (max ~3 pokusy).
 */
export async function downloadInvoicePdf(
  id: number | string
): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fk(`/invoices/${id}/download.pdf`, {
      headers: { Accept: "application/pdf" },
    });
    if (res.status === 204) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  return null;
}
