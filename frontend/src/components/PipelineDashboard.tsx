import { useCallback, useEffect, useMemo, useState } from "react";
import { useMergeLink } from "@mergeapi/react-merge-link";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
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

function renderCompactTable(title: string, records: CrmRecord[], options?: { showAmount?: boolean; showContact?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string>("");
  const [pendingOriginId, setPendingOriginId] = useState<string | null>(null);
  const [openWhenReady, setOpenWhenReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "not_connected">("checking");
  const [dashboardData, setDashboardData] = useState<UnifiedDashboardResponse | null>(null);
  const [report, setReport] = useState<PipelineAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const endUserOriginId = user?.userid ?? "";

  const checkConnectionStatus = useCallback(async () => {
    try {
      const res = await api.get<{ connected: boolean }>("/api/merge/status");
      setConnectionStatus(res.data.connected ? "connected" : "not_connected");
      return res.data.connected;
    } catch {
      setConnectionStatus("not_connected");
      return false;
    }
  }, []);

  const createLinkToken = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        throw new Error("User not loaded yet");
      }
      const res = await api.post("/api/merge/link-token", {
        end_user_origin_id: user.userid,
        end_user_organization_name: user.org_name ?? user.username,
        end_user_email_address: user.email ?? "demo@example.com",
      });
      setLinkToken(res.data.link_token);
      setPendingOriginId(res.data.end_user_origin_id ?? user.userid);
      setOpenWhenReady(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to create link token");
    } finally {
      setBusy(false);
    }
  }, [user]);

  const onSuccess = useCallback(
    async (public_token: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.post("/api/merge/account-token", {
          public_token,
          end_user_origin_id: pendingOriginId ?? user?.userid,
        });
        if (!res.data?.account_token) {
          throw new Error("Merge did not return account_token");
        }
        setConnectionStatus("connected");
        await fetchUnifiedDashboard();
      } catch (e: any) {
        setError(e?.response?.data?.error ?? e?.message ?? "Failed to exchange account token");
      } finally {
        setBusy(false);
      }
    },
    [pendingOriginId, user?.userid]
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

  useEffect(() => {
    if (!openWhenReady || !isReady || !linkToken) {
      return;
    }
    open();
    setOpenWhenReady(false);
  }, [openWhenReady, isReady, linkToken, open]);

  const analyze = useCallback(async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await api.post<PipelineAnalysisReport>("/api/analyze-pipeline", {});
      setReport(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      const backendError = e?.response?.data?.error;
      setError(
        backendError ||
          e?.message ||
          (status ? `Analyze failed (${status})` : "Failed to analyze pipeline")
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const fetchUnifiedDashboard = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<UnifiedDashboardResponse>("/api/hubspot/unified-dashboard", {});
      setDashboardData(normalizeDashboardData(res.data));
      setConnectionStatus("connected");
    } catch (e: any) {
      const status = e?.response?.status;
      const backendError = e?.response?.data?.error;
      setError(
        backendError ||
          e?.message ||
          (status ? `Fetch failed (${status})` : "Failed to fetch HubSpot data")
      );
      if ((backendError ?? "").toLowerCase().includes("no account_token stored")) {
        setConnectionStatus("not_connected");
        setDashboardData(null);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!endUserOriginId) {
      return;
    }

    const bootstrap = async () => {
      const connected = await checkConnectionStatus();
      if (connected) {
        await fetchUnifiedDashboard();
      }
    };

    void bootstrap();
  }, [endUserOriginId, checkConnectionStatus, fetchUnifiedDashboard]);

  const summary = dashboardData?.summary;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#eef2ff_40%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            Back to Home
          </Link>
          <span className="text-sm text-slate-600">Signed in as {user?.username ?? "user"}</span>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 px-6 py-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Revenue Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-sky-100 sm:text-base">
            Persistent CRM connection, live entity coverage, and one-click pipeline risk analysis.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">CRM Connection</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "checking"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
              />
              <span className="text-sm font-medium text-slate-800">
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "checking"
                    ? "Checking connection"
                    : "Not connected"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">User ID: {endUserOriginId || "Loading..."}</p>

            <div className="mt-4 grid gap-2">
              <button
                onClick={createLinkToken}
                disabled={busy || !endUserOriginId}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connectionStatus === "connected" ? "Reconnect CRM" : "Connect CRM"}
              </button>
              <button
                onClick={fetchUnifiedDashboard}
                disabled={busy || connectionStatus !== "connected"}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh Data
              </button>
              <button
                onClick={analyze}
                disabled={busy || !dashboardData}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Analyze Pipeline
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Deals", value: summary?.total_deals ?? 0 },
                { label: "Opportunities", value: summary?.total_opportunities ?? 0 },
                { label: "Contacts", value: summary?.total_contacts ?? 0 },
                { label: "Companies", value: summary?.total_companies ?? 0 },
                { label: "Engagements", value: summary?.total_engagements ?? 0 },
                { label: "Stale Deals", value: summary?.stale_deals ?? 0 },
                { label: "Total Amount", value: (summary?.total_amount ?? 0).toLocaleString() },
                { label: "Data Sync", value: dashboardData ? new Date(dashboardData.fetched_at).toLocaleTimeString() : "-" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isReady && linkToken ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Merge connector is preparing. If it does not open automatically, click connect again.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {dashboardData ? (
          <div className="mt-6 space-y-4">
            {dashboardData.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">Partial Data Warnings</div>
                <ul className="mt-2 list-disc pl-5">
                  {dashboardData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Deals</h2>
                  <span className="text-xs text-slate-500">{dashboardData.deals.length} records</span>
                </div>
                <div className="mt-3 overflow-x-auto">
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
          </div>
        ) : connectionStatus === "not_connected" ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Connect CRM to Start</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your connection is persisted once completed. You should not need to reconnect every session.
            </p>
            <button
              onClick={createLinkToken}
              disabled={busy || !endUserOriginId}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect CRM Now
            </button>
          </div>
        ) : null}

        {report ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Risk Signals</h2>
              <div className="text-sm text-gray-600">
                High risk: {report.summary.high_risk_count} / {report.summary.total_deals}
              </div>
            </div>

            {report.high_risk_deals.length === 0 ? (
              <div className="mt-4 rounded-md border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">
                No high-risk deals detected.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {report.high_risk_deals.map((d) => (
                  <div key={d.deal_id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold text-red-900">{d.deal_name || d.deal_id}</div>
                      <div className="text-xs text-red-900/80">
                        Stage: {d.stage ?? "-"} · Amount: {d.amount ?? "-"}
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
