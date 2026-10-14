
function StatCard({
  title,
  value,
  detail = "No additional details",
  className = ""
}) {
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <h2 className="text-sm font-medium text-slate-500">
        {title}
      </h2>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {detail}
      </p>
    </article>
  );
}

export default StatCard;
