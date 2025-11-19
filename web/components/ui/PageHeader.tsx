interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">{title}</h1>
      {subtitle && <p className="text-lg text-slate-600">{subtitle}</p>}
    </div>
  );
}

