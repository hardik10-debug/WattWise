import StatCard from "../components/dashboard/StatCard";
import PageHeader from "../components/layout/PageHeader";
import useDashboard from "../hooks/useDashboard";

function Overview() {
  const { stats, loading, error } = useDashboard();

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Monitor your properties, meters, and electricity bills."
      />

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Properties"
          value={loading ? "..." : stats.properties}
          detail="Total registered properties"
        />

        <StatCard
          title="Meters"
          value={loading ? "..." : stats.meters}
          detail="Total registered meters"
        />

        <StatCard
          title="Consumption"
          value={
            loading
              ? "..."
              : stats.consumption === null
                ? "N/A"
                : `${stats.consumption.toFixed(2)} kWh`
          }
          detail="Electricity usage in kWh"
        />

        <StatCard
          title="Latest bill"
          value={
            loading
              ? "..."
              : stats.latestBill === null
                ? "N/A"
                : `₹${stats.latestBill.toLocaleString("en-IN")}`
          }
          detail="Most recent recorded bill"
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold">
            Electricity consumption
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your consumption chart will appear here.
          </p>

          <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-400">
              Chart coming soon
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Recent activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your latest bills and meter readings will appear here.
          </p>
        </article>
      </section>
    </>
  );
}

export default Overview;
