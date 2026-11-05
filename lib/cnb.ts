import { unstable_cache } from "next/cache";
import type { Rates } from "@/lib/costs";

/**
 * Denní kurzy ČNB (Kč za 1 jednotku měny). Textový export, bez klíče.
 * Pro víkend a svátky ČNB vrací poslední platný kurz.
 */
const CNB_URL =
  "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";

/** Záložní kurz, když ČNB neodpoví (přehled pak upozorní, že je orientační). */
const FALLBACK: Rates = { CZK: 1, USD: 23, EUR: 25 };

function cnbDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`;
}

async function fetchRates(date: string): Promise<Rates> {
  const res = await fetch(`${CNB_URL}?date=${date}`);
  if (!res.ok) throw new Error(`ČNB ${res.status}`);
  const text = await res.text();
  const rates: Partial<Rates> = { CZK: 1 };
  // Řádek: země|měna|množství|kód|kurz (kurz s desetinnou čárkou)
  for (const line of text.split("\n").slice(2)) {
    const [, , amount, code, rate] = line.split("|");
    if (code === "USD" || code === "EUR") {
      rates[code] = Number(rate.replace(",", ".")) / Number(amount);
    }
  }
  if (!rates.USD || !rates.EUR) throw new Error("ČNB: chybí kurz USD nebo EUR");
  return rates as Rates;
}

/** Kurzy k danému dni (výchozí dnes), cache 12 h. `approx` = záložní kurz. */
export async function cnbRates(date: Date = new Date()): Promise<{ rates: Rates; approx: boolean }> {
  const key = cnbDate(date);
  try {
    const rates = await unstable_cache(() => fetchRates(key), ["cnb-rates", key], {
      revalidate: 43200,
    })();
    return { rates, approx: false };
  } catch (error) {
    console.error("[cnb] kurzy se nepodařilo načíst", error);
    return { rates: FALLBACK, approx: true };
  }
}
