/**
 * Base URL of the external client-facing "card form" (vizitka-formulář) on
 * www.solopixel.cz, where a client fills in the data we need to build their card.
 * The token is appended directly. Shared by the client button and the server
 * route that sends the invitation e-mail.
 */
export const CARD_FORM_BASE_URL =
  process.env.NEXT_PUBLIC_CARD_FORM_BASE_URL ??
  "https://www.solopixel.cz/cs/vizitka-formular?token=";

export function buildCardFormUrl(token: string): string {
  return `${CARD_FORM_BASE_URL}${token}`;
}
