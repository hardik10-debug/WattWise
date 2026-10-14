
function PageHeader({ title, subtitle }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-sm font-medium text-emerald-600">
        WATTWISE / DASHBOARD
      </p>

      <h1 className="text-3xl font-bold tracking-tight">
        {title}
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>
    </header>
  );
}

export default PageHeader;
