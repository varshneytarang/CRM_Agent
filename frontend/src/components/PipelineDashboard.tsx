import { useCallback, useMemo, useState } from "react";
import { useMergeLink } from "@mergeapi/react-merge-link";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { PipelineAnalysisReport } from "../contracts/report";
import type { CrmRecord, UnifiedDashboardResponse } from "../contracts/unifiedDashboard";

function normalizeDashboardData(raw: any): UnifiedDashboardResponse {
  return {
    source: raw?.source ?? "hubspot",
    fetched_at: raw?.fetched_at ?? new Date().toISOString(),
    summary: {
      total_deals: raw?.summary?.total_deals ?? (raw?.deals?.length ?? 0),
      total_opportunities:
        raw?.summary?.total_opportunities ?? (raw?.opportunities?.length ?? 0),
      total_contacts: raw?.summary?.total_contacts ?? (raw?.contacts?.length ?? 0),
      total_companies: raw?.summary?.total_companies ?? (raw?.companies?.length ?? 0),
      total_engagements:
        raw?.summary?.total_engagements ?? (raw?.engagements?.length ?? 0),
      total_amount: raw?.summary?.total_amount ?? 0,
      stale_deals: raw?.summary?.stale_deals ?? 0,
    },
    deals: Array.isArray(raw?.deals) ? raw.deals : [],
    opportunities: Array.isArray(raw?.opportunities) ? raw.opportunities : [],
    contacts: Array.isArray(raw?.contacts) ? raw.contacts : [],
    companies: Array.isArray(raw?.companies) ? raw.companies : [],
    engagements: Array.isArray(raw?.engagements) ? raw.engagements : [],
    warnings: Array.isArray(raw?.warnings) ? raw.warnings : [],
  };
}

function renderCompactTable(
  title: string,
  records: CrmRecord[],
  options?: { showAmount?: boolean; showContact?: boolean }
) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">{records.length} records</span>
      </div>
      {records.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">No records available.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Name</th>
                {options?.showAmount ? <th className="px-2 py-2">Amount</th> : null}
                <th className="px-2 py-2">Stage/Status</th>
                {options?.showContact ? <th className="px-2 py-2">Email</th> : null}
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.slice(0, 12).map((item) => (
                <tr key={item.id}>
                  <td className="px-2 py-2">{item.name || item.id}</td>
                  {options?.showAmount ? <td className="px-2 py-2">{item.amount ?? "-"}</td> : null}
                  <td className="px-2 py-2">{item.stage ?? "-"}</td>
                  {options?.showContact ? <td className="px-2 py-2">{item.email ?? "-"}</td> : null}
                  <td className="px-2 py-2">{item.owner ?? "-"}</td>
                  <td className="px-2 py-2">{item.last_activity ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PipelineDashboard() {
  const [endUserOriginId, setEndUserOriginId] = useState("demo-user-1");
  const [linkToken, setLinkToken] = useState<string>("");
  const [accountToken, setAccountToken] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<UnifiedDashboardResponse | null>(null);
  const [report, setReport] = useState<PipelineAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createLinkToken = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/api/merge/link-token", {
        end_user_origin_id: endUserOriginId,
        end_user_organization_name: "Demo Org",
        end_user_email_address: "demo@example.com",
      });
      setLinkToken(res.data.link_token);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to create link token");
    } finally {
      setBusy(false);
    }
  }, [endUserOriginId]);

  const onSuccess = useCallback(
    async (public_token: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.post("/api/merge/account-token", {
          public_token,
          end_user_origin_id: endUserOriginId,
        });
        setAccountToken(res.data.account_token);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? e?.message ?? "Failed to exchange account token");
      } finally {
        setBusy(false);
      }
    },
    [endUserOriginId]
  );

  const { open, isReady } = useMergeLink(
    useMemo(
      () => ({
        linkToken,
        onSuccess,
      }),
      [linkToken, onSuccess]
    )
  );

  const analyze = useCallback(async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await api.post<PipelineAnalysisReport>("/api/analyze-pipeline", {
        end_user_origin_id: endUserOriginId,
      });
      setReport(res.data);
      console.log("Pipeline analysis report:", res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      const backendError = e?.response?.data?.error;
      setError(
        backendError ||
          e?.message ||
          (status ? `Analyze failed (${status})` : "Failed to analyze pipeline")
      );
      console.error("Failed to analyze pipeline", e);
    } finally {
      setBusy(false);
    }
  }, [endUserOriginId]);

  const fetchUnifiedDashboard = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<UnifiedDashboardResponse>("/api/hubspot/unified-dashboard", {
        end_user_origin_id: endUserOriginId,
      });
      console.log("Fetched unified dashboard data:", res.data);
      setDashboardData(normalizeDashboardData(res.data));
    } catch (e: any) {
      const status = e?.response?.status;
      const backendError = e?.response?.data?.error;
      setError(
        backendError ||
          e?.message ||
          (status ? `Fetch failed (${status})` : "Failed to fetch HubSpot data")
      );
    } finally {
      setBusy(false);
    }
  }, [endUserOriginId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-5">
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to Home
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">HubSpot Unified Dashboard</h1>
          <p className="text-sm text-gray-600">
            Connect HubSpot, fetch normalized CRM data, and run pipeline analysis from this page.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-gray-700">End user origin id</label>
          <input
            value={endUserOriginId}
            onChange={(e) => setEndUserOriginId(e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. customer-123"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={createLinkToken}
              disabled={busy}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              1) Get link token
            </button>
            <button
              onClick={open}
              disabled={!isReady || !linkToken || busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              2) Connect HubSpot
            </button>
            <button
              onClick={fetchUnifiedDashboard}
              disabled={!accountToken || busy}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              3) Fetch unified data
            </button>
            <button
              onClick={analyze}
              disabled={!dashboardData || busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              4) Analyze pipeline
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <div>Link token: {linkToken ? "ready" : "not created"}</div>
            <div>Account token: {accountToken ? "stored (in-memory)" : "not stored"}</div>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </div>

        {dashboardData ? (
          <div className="mt-6 space-y-4">
            {dashboardData.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">Some CRM resources could not be fetched</div>
                <ul className="mt-2 list-disc pl-5">
                  {dashboardData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Deals</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_deals}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Opportunities</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_opportunities}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Contacts</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_contacts}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Companies</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_companies}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Engagements</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_engagements}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Amount</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.total_amount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Stale Deals</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {dashboardData.summary.stale_deals}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Fetched HubSpot Deals</h2>
                <span className="text-xs text-slate-500">
                  Synced: {new Date(dashboardData.fetched_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Deal</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Stage</th>
                      <th className="px-2 py-2">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {dashboardData.deals.map((deal) => (
                      <tr key={deal.id}>
                        <td className="px-2 py-2">{deal.name || deal.id}</td>
                        <td className="px-2 py-2">{deal.amount ?? "-"}</td>
                        <td className="px-2 py-2">{deal.stage ?? "-"}</td>
                        <td className="px-2 py-2">{deal.last_activity ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {renderCompactTable("Opportunities", dashboardData.opportunities, { showAmount: true })}
            {renderCompactTable("Contacts", dashboardData.contacts, { showContact: true })}
            {renderCompactTable("Companies", dashboardData.companies, { showContact: true })}
            {renderCompactTable("Engagements", dashboardData.engagements)}
          </div>
        ) : null}

        {report ? (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Risk Signals</h2>
              <div className="text-sm text-gray-600">
                High risk: {report.summary.high_risk_count} / {report.summary.total_deals}
              </div>
            </div>

            {report.high_risk_deals.length === 0 ? (
              <div className="mt-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                No high-risk deals detected.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {report.high_risk_deals.map((d) => (
                  <div
                    key={d.deal_id}
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold text-red-900">
                        {d.deal_name || d.deal_id}
                      </div>
                      <div className="text-xs text-red-900/80">
                        Stage: {d.stage ?? "—"} · Amount: {d.amount ?? "—"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-red-900">
                      <div className="font-medium">Signals</div>
                      <ul className="mt-1 list-disc pl-5">
                        {d.signals.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
