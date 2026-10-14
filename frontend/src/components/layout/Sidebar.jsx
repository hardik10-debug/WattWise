
const navigation = [
  { label: "Overview", href: "#overview" },
  { label: "Consumption", href: "#consumption" },
  { label: "Electricity bills", href: "#bills" },
  { label: "Meter readings", href: "#readings" },
];

function Sidebar() {
  return (
    <aside className="flex w-full flex-col bg-slate-950 p-5 text-white md:fixed md:inset-y-0 md:left-0 md:w-64">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-emerald-300 text-lg font-black text-slate-950">
          W
        </div>
        <span className="text-xl font-bold tracking-tight">
          WattWise
        </span>
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold tracking-widest text-slate-500">
        WORKSPACE
      </p>

      <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {navigation.map((item, index) => (
          <a
            key={item.label}
            href={item.href}
            className={`rounded-xl px-3 py-3 text-sm transition ${
              index === 0
                ? "bg-emerald-400/15 font-semibold text-emerald-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-8 flex items-center gap-2 border-t border-slate-800 pt-5 text-xs text-slate-400 md:mt-auto">
        <span className="size-2 rounded-full bg-emerald-400" />
        API connected
      </div>
    </aside>
  );
}

export default Sidebar;
