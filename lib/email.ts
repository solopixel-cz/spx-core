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

/**
 * Render outreach email template: replace {{jmeno}} and {{odkaz}} placeholders.
 * Body text is converted to minimal HTML (paragraphs separated by blank lines).
 */
export function renderTemplate(
  template: { subject: string; body: string },
  variables: { jmeno: string; odkaz: string }
): { subject: string; html: string } {
  const replaceVars = (text: string) =>
    text
      .replace(/\{\{jmeno\}\}/g, variables.jmeno)
      .replace(/\{\{odkaz\}\}/g, variables.odkaz);

  const subject = replaceVars(template.subject);
  const bodyText = replaceVars(template.body);

  // Convert plain text to simple HTML paragraphs
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px 0;line-height:1.5;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
${paragraphs}
</body>
</html>`;

  return { subject, html };
}

export interface SendOutreachEmailParams {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  html: string;
}

export async function sendOutreachEmail(params: SendOutreachEmailParams) {
  const resend = getResend();

  const result = await resend.emails.send({
    from: `${params.senderName} <${params.senderEmail}>`,
    replyTo: params.senderEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
