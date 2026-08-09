interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, action, children }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  );
}
