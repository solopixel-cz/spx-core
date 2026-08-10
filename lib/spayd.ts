/**
 * SPAYD (Short Payment Descriptor) — Czech QR Payment string.
 * Formát: `SPD*1.0*ACC:<IBAN>*AM:<částka>*CC:CZK*X-VS:<VS>*MSG:<zpráva>`
 * Kód se vykreslí jako QR na fakturu i do e-mailu; klient naskenuje mobilem.
 */

/** Mod 97 nad dlouhým číslem v řetězci (pro IBAN kontrolní číslice). */
function mod97(numeric: string): number {
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return remainder;
}

/**
 * Dopočítá český IBAN z čísla účtu ve tvaru `[předčíslí-]číslo/kódbanky`
 * (např. `19-123456789/0300` nebo `123456789/0300`). Vrací null při nevalidním vstupu.
 */
export function accountToIban(account: string): string | null {
  const cleaned = account.replace(/\s/g, "");
  const match = cleaned.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!match) return null;
  const prefix = (match[1] ?? "").padStart(6, "0");
  const number = match[2].padStart(10, "0");
  const bank = match[3];

  const bban = bank + prefix + number;
  // Kontrolní číslice: BBAN + "CZ00" (C=12, Z=35) → 98 - mod97.
  const check = 98 - mod97(`${bban}123500`);
  const checkStr = String(check).padStart(2, "0");
  return `CZ${checkStr}${bban}`;
}

/** Očistí text pro MSG/X-VS pole (bez `*`, bez diakritiky navíc, max 60 znaků). */
function sanitize(text: string, max = 60): string {
  return text
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export interface SpaydParams {
  iban: string;
  amount: number;
  variableSymbol?: string;
  message?: string;
}

/** Sestaví SPAYD řetězec. `amount` v CZK (celé koruny). */
export function buildSpayd({
  iban,
  amount,
  variableSymbol,
  message,
}: SpaydParams): string {
  const parts = [
    "SPD",
    "1.0",
    `ACC:${iban.replace(/\s/g, "")}`,
    `AM:${amount.toFixed(2)}`,
    "CC:CZK",
  ];
  if (variableSymbol) parts.push(`X-VS:${variableSymbol.replace(/\D/g, "")}`);
  if (message) parts.push(`MSG:${sanitize(message)}`);
  return parts.join("*");
}
