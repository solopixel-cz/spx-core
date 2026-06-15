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
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

/** @deprecated Use sendTransactionalEmail */
export const sendOutreachEmail = sendTransactionalEmail;
export type SendOutreachEmailParams = SendTransactionalEmailParams;
