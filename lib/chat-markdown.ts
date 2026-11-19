/**
 * Markdown pro chat u ticketů: malá bezpečná podmnožina (žádné HTML, vše se
 * kreslí jako React prvky) a seznamy ke schválení. Čistá funkce, stejně ji
 * používá zobrazení i server při hlasování (ověří, že seznam a bod existují).
 *
 * Bloky: odstavec, nadpis (#, ##, ###), seznam (-, *, 1.), citace (>),
 * blok kódu (```), čára (---) a seznam ke schválení. Řádkové: `kód`, **tučně**, *kurzíva*
 * a odkazy (lib/message-links.ts).
 *
 * Seznam ke schválení (v datech `poll`) = úkolový seznam `- [ ] …` (stačí jeden
 * bod, počet není omezený), nebo aspoň dva body s písmeny po pořadí `A) …`,
 * `B. …`, `**A)** …` (jak je píše třeba Claude). Písmena se nezobrazují.
 * Každý u každého bodu dá ✓ nebo ✗. Nadpis seznamu je odstavec nebo nadpis
 * hned nad body (bez prázdného řádku).
 */

export interface PollOption {
  /** Pořadí bodu v seznamu ("0", "1"…), klíč hlasu. */
  key: string;
  text: string;
}

export type ChatBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "rule" }
  | { type: "poll"; index: number; question: string; options: PollOption[] };

const LETTER_OPTION = /^\s*(?:[-*]\s+)?(?:\*\*)?([A-Za-z])[).:](?:\*\*)?\s+(.+)$/;
const TASK_OPTION = /^\s*[-*]\s+\[[ xX]?\]\s+(.+)$/;
const UL_ITEM = /^\s*[-*]\s+(.+)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.+)$/;
const HEADING = /^(#{1,3})\s+(.+)$/;
const FENCE = /^\s*```\s*([\w+-]*)\s*$/;

const letter = (i: number) => String.fromCharCode(65 + i);
const MAX_POLL_ITEMS = 50;

/** Body seznamu ke schválení od řádku `start`: úkolový seznam, nebo písmena A, B, C… po pořadí. */
function readPollOptions(lines: string[], start: number): PollOption[] {
  const options: PollOption[] = [];
  const first = lines[start] ?? "";
  if (TASK_OPTION.test(first)) {
    for (let i = start; i < lines.length; i++) {
      const m = lines[i].match(TASK_OPTION);
      if (!m) break;
      options.push({ key: String(options.length), text: m[1].trim() });
    }
  } else {
    for (let i = start; i < lines.length; i++) {
      const m = lines[i].match(LETTER_OPTION);
      if (!m || m[1].toUpperCase() !== letter(options.length)) break;
      options.push({ key: String(options.length), text: m[2].trim() });
    }
  }
  const min = TASK_OPTION.test(first) ? 1 : 2;
  return options.length >= min ? options.slice(0, MAX_POLL_ITEMS) : [];
}

export function parseChatMarkdown(source: string): ChatBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ChatBlock[] = [];
  let paragraph: string[] = [];
  let polls = 0;

  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fence = line.match(FENCE);
    if (fence) {
      flush();
      const code: string[] = [];
      let j = i + 1;
      while (j < lines.length && !FENCE.test(lines[j])) code.push(lines[j++]);
      blocks.push({ type: "code", lang: fence[1], code: code.join("\n") });
      i = j; // uzavírací ``` (nebo konec zprávy)
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    const options = readPollOptions(lines, i);
    if (options.length) {
      // Otázka: odstavec nebo nadpis těsně nad možnostmi.
      let question = "";
      if (paragraph.length) {
        question = paragraph.join("\n");
        paragraph = [];
      } else {
        const prev = blocks.at(-1);
        if (prev?.type === "heading" && lines[i - 1]?.trim()) {
          question = prev.text;
          blocks.pop();
        }
      }
      blocks.push({ type: "poll", index: polls++, question, options });
      i += options.length - 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }

    if (/^\s*>/.test(line)) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      i--;
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }

    const ordered = OL_ITEM.test(line);
    if (ordered || UL_ITEM.test(line)) {
      flush();
      const re = ordered ? OL_ITEM : UL_ITEM;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].match(re)![1].trim());
      i--;
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Ankety ve zprávě (pro ověření hlasu na serveru). */
export function chatPolls(source: string) {
  return parseChatMarkdown(source).filter((b): b is Extract<ChatBlock, { type: "poll" }> => b.type === "poll");
}

export type InlinePart =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string };

// `kód` má přednost (uvnitř se nic neformátuje), pak **tučně** a *kurzíva*.
// Podtržítka se nepoužívají, v technickém textu (snake_case) by dělala neplechu.
const INLINE_RE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|(?<![\w*])\*([^*\s][^*\n]*?)\*(?![\w*])/g;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const index = m.index ?? 0;
    if (index > last) parts.push({ type: "text", text: text.slice(last, index) });
    if (m[1] !== undefined) parts.push({ type: "code", text: m[1] });
    else if (m[2] !== undefined) parts.push({ type: "strong", text: m[2] });
    else parts.push({ type: "em", text: m[3] });
    last = index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
