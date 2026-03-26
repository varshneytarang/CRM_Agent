import {
  Mail,
  Eye,
  Link2,
  MessageCircle,
  AlertTriangle,
  LogOut,
} from "lucide-react";

export interface EngagementSignal {
  id: string;
  userid: string;
  lead_email: string;
  event_type: string;
  event_data: Record<string, any>;
  provider: string;
  timestamp: string;
  created_at: string;
}

interface SignalMonitorProps {
  signals: EngagementSignal[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

export default function SignalMonitor({
  signals,
  loading,
  onRefresh,
}: SignalMonitorProps) {
  if (!signals || signals.length === 0) {
    return null;
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "open":
        return <Eye className="w-5 h-5 text-blue-600" />;
      case "click":
        return <Link2 className="w-5 h-5 text-green-600" />;
      case "reply":
        return <MessageCircle className="w-5 h-5 text-purple-600" />;
      case "bounce":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "unsubscribe":
        return <LogOut className="w-5 h-5 text-orange-600" />;
      default:
        return <Mail className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "open":
        return "bg-blue-50 border-blue-200";
      case "click":
        return "bg-green-50 border-green-200";
      case "reply":
        return "bg-purple-50 border-purple-200";
      case "bounce":
        return "bg-red-50 border-red-200";
      case "unsubscribe":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getEventLabel = (eventType: string) => {
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  };

  // Group signals by email
  const signalsByEmail = signals.reduce(
    (acc, signal) => {
      if (!acc[signal.lead_email]) {
        acc[signal.lead_email] = [];
      }
      acc[signal.lead_email].push(signal);
      return acc;
    },
    {} as Record<string, EngagementSignal[]>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Engagement Signals
        </h3>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded">
            {signals.length} Events
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(signalsByEmail).map(([email, emailSignals]) => (
          <div key={email}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 px-1">
              {email}
            </h4>
            <div className="space-y-2 ml-2 border-l-2 border-gray-200 pl-3">
              {emailSignals.map((signal) => (
                <div
                  key={signal.id}
                  className={`border rounded p-2 text-sm ${getEventColor(
                    signal.event_type
                  )}`}
                >
                  <div className="flex items-start gap-2">
                    {getEventIcon(signal.event_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h5 className="font-medium text-gray-800">
                          {getEventLabel(signal.event_type)}
                        </h5>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {signal.timestamp &&
                            new Date(signal.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        Provider: {signal.provider}
                      </p>

                      {/* Event Data Details */}
                      {signal.event_data && Object.keys(signal.event_data).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-semibold">
                            Details
                          </summary>
                          <div className="mt-1 bg-white rounded p-2 space-y-1">
                            {Object.entries(signal.event_data).map(
                              ([key, value]) => (
                                <div key={key} className="flex gap-2 text-gray-600">
                                  <span className="font-semibold">{key}:</span>
                                  <span className="truncate">
                                    {typeof value === "string"
                                      ? value
                                      : JSON.stringify(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Signal Summary */}
      <div className="bg-gray-50 rounded p-3">
        <h5 className="font-semibold text-sm text-gray-700 mb-2">Summary</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["open", "click", "reply", "bounce", "unsubscribe"].map((type) => {
            const count = signals.filter((s) => s.event_type === type).length;
            return count > 0 ? (
              <div key={type} className="flex items-center gap-2">
                {getEventIcon(type)}
                <span className="text-gray-600">
                  {getEventLabel(type)}: <span className="font-semibold">{count}</span>
                </span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
