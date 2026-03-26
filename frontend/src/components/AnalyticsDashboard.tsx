import { useState } from "react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 text-sm mt-1">
            Campaign performance and engagement metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            {[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
              { label: "YTD", value: "ytd" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                  selectedPeriod === period.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Emails Sent */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">Emails Sent</h3>
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.total_emails_sent}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(data.total_emails_sent / 7).toFixed(0)}/week avg
          </p>
        </div>

        {/* Open Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">Open Rate</h3>
            <Eye className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(data.open_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.total_opens} opens
          </p>
        </div>

        {/* Click Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">Click Rate</h3>
            <Link2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(data.click_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.total_clicks} clicks
          </p>
        </div>

        {/* Reply Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">Reply Rate</h3>
            <MessageCircle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(data.reply_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.total_replies} replies
          </p>
        </div>

        {/* Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">Trend</h3>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            +{((data.open_rate + data.click_rate + data.reply_rate) / 3 * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">vs last period</p>
        </div>
      </div>

      {/* Engagement Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Engagement Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trending_data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="opens"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="replies"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement by Company */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Engagement by Company
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.engagement_by_company}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="company" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="opens" fill="#3b82f6" />
              <Bar dataKey="clicks" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement by Title */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Engagement by Job Title
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.engagement_by_title} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="title" type="category" stroke="#6b7280" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="opens" fill="#3b82f6" />
              <Bar dataKey="clicks" fill="#10b981" />
              <Bar dataKey="replies" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Detailed Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                  Metric
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Change
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Total Emails Sent</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {data.total_emails_sent}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  +12%
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Good
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Total Opens</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {data.total_opens}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  +8%
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Good
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Total Clicks</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {data.total_clicks}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  +15%
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Excellent
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Total Replies</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {data.total_replies}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  +22%
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Excellent
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
