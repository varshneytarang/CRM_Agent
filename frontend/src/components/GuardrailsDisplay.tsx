import { AlertCircle, Clock, AlertTriangle, Zap } from "lucide-react";

interface GuardrailsData {
  is_compliant: boolean;
  violations: string[];
  warnings: string[];
  domain_warmup_status: string;
  emails_sent_today: number;
  daily_send_limit: number;
  can_send_email: boolean;
  reason: string;
}

interface GuardrailsDisplayProps {
  guardrails: GuardrailsData | null;
  loading?: boolean;
}

export default function GuardrailsDisplay({
  guardrails,
  loading,
}: GuardrailsDisplayProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Clock className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-600">Checking guardrails...</span>
      </div>
    );
  }

  if (!guardrails) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Compliance Guardrails
        </h3>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded text-sm font-medium text-white ${
              guardrails.is_compliant
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {guardrails.is_compliant ? "✓ Compliant" : "✗ Violations"}
          </span>
          <span
            className={`px-3 py-1 rounded text-sm font-medium text-white ${
              guardrails.can_send_email
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {guardrails.can_send_email ? "✓ Can Send" : "✗ Blocked"}
          </span>
        </div>
      </div>

      {/* Domain Status */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Domain Warmup:</span>
          <p className="font-medium capitalize text-gray-800">
            {guardrails.domain_warmup_status}
          </p>
        </div>
        <div>
          <span className="text-gray-600">Daily Send Limit:</span>
          <p className="font-medium text-gray-800">
            {guardrails.emails_sent_today} / {guardrails.daily_send_limit}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${
                guardrails.emails_sent_today >= guardrails.daily_send_limit
                  ? "bg-red-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(
                  (guardrails.emails_sent_today / guardrails.daily_send_limit) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Violations */}
      {guardrails.violations.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <h4 className="flex items-center gap-2 text-red-800 font-semibold mb-2">
            <AlertCircle className="w-4 h-4" />
            Violations ({guardrails.violations.length})
          </h4>
          <ul className="space-y-1">
            {guardrails.violations.map((v, i) => (
              <li key={i} className="text-red-700 text-sm">
                • {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {guardrails.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <h4 className="flex items-center gap-2 text-yellow-800 font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({guardrails.warnings.length})
          </h4>
          <ul className="space-y-1">
            {guardrails.warnings.map((w, i) => (
              <li key={i} className="text-yellow-700 text-sm">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded p-3 text-sm">
        <p className="text-gray-700">
          <span className="font-semibold">Status:</span> {guardrails.reason}
        </p>
      </div>
    </div>
  );
}
