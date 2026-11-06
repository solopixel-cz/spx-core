import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

/** Verified sending domain — only emails on this domain are accepted as senderEmail override. */
export const SENDER_DOMAIN = "solopixel.cz";

/**
 * Replace {{jmeno}} and {{odkaz}} in a subject string.
 */
export function renderSubject(
  subject: string,
  variables: { jmeno: string; odkaz: string }
): string {
  return subject
    .replace(/\{\{jmeno\}\}/g, variables.jmeno)
    .replace(/\{\{odkaz\}\}/g, variables.odkaz);
}

export interface SendTransactionalEmailParams {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  const resend = getResend();

  const result = await resend.emails.send({
    from: `${params.senderName} <${params.senderEmail}>`,
    replyTo: params.senderEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export interface BatchEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Výsledek jednoho e-mailu z dávky (stejné pořadí jako vstup). */
export type BatchEmailResult = { ok: true; id: string } | { ok: false; error: string };

const BATCH_MAX = 100;
const RATE_LIMIT_RETRIES = 4;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hromadné odeslání přes Resend batch API (až 100 e-mailů jedním požadavkem).
 * Jednotlivé e-maily by narazily na limit požadavků za sekundu (výchozí 2/s,
 * nad ním 429 a e-mail neodejde). Při 429 čeká a zkusí znovu. Chyba jednoho
 * e-mailu (neplatná adresa) neshodí ostatní (`batchValidation: 'permissive'`).
 * Nikdy nevyhazuje, chyby vrací u každého e-mailu.
 */
export async function sendBatchEmails(
  sender: { senderName: string; senderEmail: string },
  emails: BatchEmail[]
): Promise<BatchEmailResult[]> {
  const resend = getResend();
  const from = `${sender.senderName} <${sender.senderEmail}>`;
  const results: BatchEmailResult[] = [];

  for (let i = 0; i < emails.length; i += BATCH_MAX) {
    const chunk = emails.slice(i, i + BATCH_MAX);
    const payload = chunk.map((e) => ({ from, replyTo: sender.senderEmail, to: e.to, subject: e.subject, html: e.html, text: e.text }));

    let chunkResults: BatchEmailResult[] | null = null;
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES && !chunkResults; attempt++) {
      if (i > 0 || attempt > 0) await wait(attempt === 0 ? 600 : 1000 * 2 ** (attempt - 1));
      try {
        const res = await resend.batch.send(payload, { batchValidation: "permissive" });
        if (res.error) {
          if (res.error.name === "rate_limit_exceeded" && attempt < RATE_LIMIT_RETRIES) continue;
          chunkResults = chunk.map(() => ({ ok: false, error: res.error!.message }));
          break;
        }
        const errors = new Map((res.data?.errors ?? []).map((e) => [e.index, e.message]));
        // `data` obsahuje jen úspěšné e-maily, v pořadí vstupu bez chybných.
        const ids = [...(res.data?.data ?? [])];
        chunkResults = chunk.map((_, index) =>
          errors.has(index)
            ? { ok: false, error: errors.get(index)! }
            : ids.length
              ? { ok: true, id: ids.shift()!.id }
              : { ok: false, error: "Resend nevrátil ID e-mailu" }
        );
      } catch (error) {
        chunkResults = chunk.map(() => ({ ok: false, error: error instanceof Error ? error.message : "Neznámá chyba" }));
      }
    }
    results.push(...(chunkResults ?? chunk.map(() => ({ ok: false as const, error: "Překročen limit odesílání, zkuste to znovu" }))));
  }
  return results;
}

/** @deprecated Use sendTransactionalEmail */
export const sendOutreachEmail = sendTransactionalEmail;
export type SendOutreachEmailParams = SendTransactionalEmailParams;
