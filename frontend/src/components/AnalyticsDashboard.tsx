import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Download,
  Eye,
  Mail,
  MessageCircle,
  Link2,
} from "lucide-react";

export interface AnalyticsData {
  period: string;
  total_emails_sent: number;
  total_opens: number;
  total_clicks: number;
  total_replies: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  trending_data: Array<{
    date: string;
    opens: number;
    clicks: number;
    replies: number;
  }>;
  engagement_by_company: Array<{
    company: string;
    emails: number;
    opens: number;
    clicks: number;
  }>;
  engagement_by_title: Array<{
    title: string;
    opens: number;
    clicks: number;
    replies: number;
  }>;
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData;
  loading?: boolean;
  onExport?: () => Promise<void>;
  onFilterChange?: (period: string) => Promise<void>;
}

export default function AnalyticsDashboard({
  data,
  loading,
  onExport,
  onFilterChange,
}: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7d");
  const [isExporting, setIsExporting] = useState(false);

  const periodLabel = useMemo(() => {
    const map: Record<string, string> = {
      "7d": "Last 7 Days",
      "30d": "Last 30 Days",
      "90d": "Last 90 Days",
      ytd: "Year To Date",
    };
    return map[selectedPeriod] ?? selectedPeriod.toUpperCase();
  }, [selectedPeriod]);

  const topCompany = useMemo(() => {
    const rows = data?.engagement_by_company ?? [];
    return rows.reduce<{ company: string; score: number } | null>((best, row) => {
      const score = row.opens + row.clicks;
      if (!best || score > best.score) {
        return { company: row.company, score };
      }
      return best;
    }, null);
  }, [data?.engagement_by_company]);

  const topTitle = useMemo(() => {
    const rows = data?.engagement_by_title ?? [];
    return rows.reduce<{ title: string; score: number } | null>((best, row) => {
      const score = row.opens + row.clicks + row.replies;
      if (!best || score > best.score) {
        return { title: row.title, score };
      }
      return best;
    }, null);
  }, [data?.engagement_by_title]);

  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    if (onFilterChange) {
      await onFilterChange(period);
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <BarChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="ds-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="ds-btn ds-btn-primary !px-3 !py-1.5 !text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exporting" : "Export"}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">Editorial insight rail with compact trend context.</p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "90D", value: "90d" },
                { label: "YTD", value: "ytd" },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => handlePeriodChange(period.value)}
                  className={`ds-btn !rounded-md !px-2 !py-1 !text-xs ${
                    selectedPeriod === period.value
                      ? "ds-btn-primary"
                      : "ds-btn-secondary"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Window</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{periodLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Top Company</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{topCompany?.company ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Top Job Title</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{topTitle?.title ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { label: "Open Rate", value: data.open_rate, color: "bg-emerald-600/70" },
              { label: "Click Rate", value: data.click_rate, color: "bg-cyan-700/70" },
              { label: "Reply Rate", value: data.reply_rate, color: "bg-sky-700/70" },
            ].map((metric) => {
              const width = Math.max(8, Math.min(100, metric.value * 100));
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{metric.label}</span>
                    <span>{(metric.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${metric.color} transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="pipeline-subtle-tile ds-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Emails Sent</h3>
              <Mail className="h-4 w-4 text-cyan-700" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{data.total_emails_sent}</p>
          </div>

          <div className="pipeline-subtle-tile ds-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Open Rate</h3>
              <Eye className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{(data.open_rate * 100).toFixed(1)}%</p>
          </div>

          <div className="pipeline-subtle-tile ds-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Click Rate</h3>
              <Link2 className="h-4 w-4 text-cyan-700" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{(data.click_rate * 100).toFixed(1)}%</p>
          </div>

          <div className="pipeline-subtle-tile ds-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Reply Rate</h3>
              <MessageCircle className="h-4 w-4 text-sky-700" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{(data.reply_rate * 100).toFixed(1)}%</p>
          </div>

          <div className="pipeline-subtle-tile ds-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Trend</h3>
              <TrendingUp className="h-4 w-4 text-indigo-700" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              +{(((data.open_rate + data.click_rate + data.reply_rate) / 3) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="ds-panel p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Engagement Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.trending_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="opens" stroke="#0891b2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="replies" stroke="#0369a1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="ds-panel p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Engagement by Company</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.engagement_by_company}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="company" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                  }}
                />
                <Legend />
                <Bar dataKey="opens" fill="#0891b2" />
                <Bar dataKey="clicks" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ds-panel p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Engagement by Job Title</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.engagement_by_title} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="title" type="category" stroke="#64748b" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                  }}
                />
                <Legend />
                <Bar dataKey="opens" fill="#0891b2" />
                <Bar dataKey="clicks" fill="#0f766e" />
                <Bar dataKey="replies" fill="#0369a1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ds-panel p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Detailed Statistics</h3>
          <div className="max-h-[320px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Metric</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Change</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr className="transition-colors hover:bg-slate-50/90">
                  <td className="px-4 py-3 text-sm text-slate-900">Total Emails Sent</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{data.total_emails_sent}</td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">+12%</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Good</span>
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-slate-50/90">
                  <td className="px-4 py-3 text-sm text-slate-900">Total Opens</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{data.total_opens}</td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">+8%</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Good</span>
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-slate-50/90">
                  <td className="px-4 py-3 text-sm text-slate-900">Total Clicks</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{data.total_clicks}</td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">+15%</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Excellent</span>
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-slate-50/90">
                  <td className="px-4 py-3 text-sm text-slate-900">Total Replies</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{data.total_replies}</td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">+22%</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Excellent</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
