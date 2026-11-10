import { parseMessageLinks } from "@/lib/message-links";
import { cn } from "@/lib/utils";

/** Text zprávy ve vlákně: zalomení řádků zachované, odkazy klikací (lib/message-links.ts). */
export function MessageText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {parseMessageLinks(text).map((part, i) =>
        part.type === "link" ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("font-medium text-primary underline underline-offset-2 hover:opacity-80", part.text === part.href && "break-all")}
          >
            {part.text}
          </a>
        ) : (
          part.text
        )
      )}
    </p>
  );
}
