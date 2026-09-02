"use client";

import { useRef, useEffect } from "react";
import { Bold, Italic, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lehký rich-text editor nad `contentEditable` — bez externí závislosti.
 * Povolené formátování: tučně, kurzíva, odkaz. Vložení schránky je vždy jako
 * prostý text (žádné cizí HTML). Hodnota je HTML string; sanitizace probíhá
 * na serveru před uložením/odesláním.
 *
 * Editor je „uncontrolled" — počáteční HTML se nastaví při mountu a dál se už
 * z props nepřepisuje (jinak by skákal kurzor). Pro vnější reset použij `key`.
 */
export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Počáteční obsah nastavíme jen jednou (mount).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  function handleLink() {
    const url = window.prompt("Zadejte URL odkazu (https://…)");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      exec("unlink");
      return;
    }
    const href = /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    exec("createLink", href);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Vždy vložit jako prostý text — žádné cizí HTML.
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex items-center gap-0.5 border-b px-1 py-1">
        <ToolbarButton label="Tučně" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Kurzíva" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Vložit odkaz" onClick={handleLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Odebrat odkaz" onClick={() => exec("unlink")}>
          <Link2Off className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className="min-h-24 px-3 py-2 text-sm leading-relaxed outline-none [&_a]:text-primary [&_a]:underline [&_p]:mb-2 [&_p:last-child]:mb-0"
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // onMouseDown místo onClick, ať se nezruší výběr textu v editoru.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
