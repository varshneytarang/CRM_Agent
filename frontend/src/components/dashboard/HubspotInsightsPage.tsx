import { useEffect, type ReactNode } from "react";
import { Building2, CalendarClock, FolderKanban, RefreshCw, Users } from "lucide-react";
import { useAgentWorkspace } from "../../context/AgentWorkspaceContext";

export function HubspotInsightsPage() {
  const { hubspotSnapshot, refreshData, isRefreshing } = useAgentWorkspace();

  useEffect(() => {
    if (!hubspotSnapshot) {
      void refreshData();
    }
  }, [hubspotSnapshot, refreshData]);

  const summary = hubspotSnapshot?.summary;

  if (!hubspotSnapshot || !summary) {
    return (
      <section className="ds-panel-strong p-6">
        <p className="ds-kicker">HubSpot Insights</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">HubSpot Full Page</h1>
        <p className="mt-2 text-sm text-slate-600">
          No HubSpot snapshot is loaded yet. Refresh to pull CRM data.
        </p>
        <button
          type="button"
          className="ds-btn ds-btn-dark mt-4"
          onClick={() => void refreshData()}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          Refresh HubSpot Data
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ds-kicker">HubSpot Insights</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Full CRM Snapshot</h1>
            <p className="mt-2 text-sm text-slate-600">
              Expanded HubSpot page from dashboard cards with synced opportunities, contacts, and deal activity.
            </p>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-dark"
            onClick={() => void refreshData()}
            title="Refresh HubSpot snapshot"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Deals" value={String(summary.total_deals ?? 0)} icon={<FolderKanban size={16} />} />
          <SummaryCard title="Opportunities" value={String(summary.total_opportunities ?? 0)} icon={<Building2 size={16} />} />
          <SummaryCard title="Contacts" value={String(summary.total_contacts ?? 0)} icon={<Users size={16} />} />
          <SummaryCard title="Stale Deals" value={String(summary.stale_deals ?? 0)} icon={<CalendarClock size={16} />} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Top Deals</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Stage</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {(hubspotSnapshot.deals ?? []).slice(0, 8).map((deal) => (
                  <tr key={deal.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{deal.name || "Untitled"}</td>
                    <td className="py-2 pr-3">{deal.stage || "-"}</td>
                    <td className="py-2">{deal.amount != null ? formatCurrency(deal.amount) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Top Contacts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Last Activity</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {(hubspotSnapshot.contacts ?? []).slice(0, 8).map((contact) => (
                  <tr key={contact.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{contact.name || "Unknown"}</td>
                    <td className="py-2 pr-3">{contact.email || "-"}</td>
                    <td className="py-2">{contact.last_activity || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
