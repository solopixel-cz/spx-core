interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, action, children }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  );
}
