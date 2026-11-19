/**
 * 5. pád křestního jména pro oslovení („Ahoj Lukáši“). Pravidla pokrývají běžná
 * česká jména; co nepozná, nechá v 1. pádě (radši „Ahoj Lucie“ než zkomolené).
 */

const VOWELS = "aeiouyáéíóúůýě";

export function vocative(name: string): string {
  const n = name.trim();
  if (n.length < 2) return n;
  const lower = n.toLowerCase();
  const last = lower.at(-1)!;
  const beforeLast = lower.at(-2)!;

  // Ženská jména na -a: Jana → Jano.
  if (last === "a") return n.slice(0, -1) + "o";
  // Na samohlásku (Lucie, Jiří, Ivo) se nemění.
  if (VOWELS.includes(last)) return n;
  // Zdeněk → Zdeňku.
  if (lower.endsWith("něk")) return n.slice(0, -3) + "ňku";
  // Marek → Marku, Radek → Radku.
  if (lower.endsWith("ek") && !VOWELS.includes(lower.at(-3) ?? "a")) return n.slice(0, -2) + "ku";
  // Patrik → Patriku, Vojtěch → Vojtěchu.
  if ("kgh".includes(last)) return n + "u";
  // Lukáš → Lukáši, Ondřej → Ondřeji, Alex → Alexi.
  if ("šžčřcjx".includes(last)) return n + "i";
  // Pavel → Pavle, Karel → Karle (Daniel → Daniele).
  if (lower.endsWith("el") && !VOWELS.includes(lower.at(-3) ?? "a")) return n.slice(0, -2) + "le";
  // Petr → Petře.
  if (last === "r" && !VOWELS.includes(beforeLast)) return n.slice(0, -1) + "ře";
  // Jan → Jane, David → Davide, Michal → Michale.
  return n + "e";
}

/** Křestní jméno z celého jména v 5. pádě. */
export function greetingName(displayName: string | null | undefined): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] ?? "";
  return first ? vocative(first) : "";
}
