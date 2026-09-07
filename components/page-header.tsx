import { BackButton } from "@/components/back-button";

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** Když je vyplněné, před titulkem se zobrazí jednotné tlačítko „zpět". */
  backHref?: string;
}

export function PageHeader({ title, action, children, backHref }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {backHref && <BackButton href={backHref} className="-ml-2 shrink-0" />}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
