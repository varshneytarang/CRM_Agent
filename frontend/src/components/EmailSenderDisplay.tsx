import { CheckCircle2, AlertCircle, Clock, Mail, Loader } from "lucide-react";

interface EmailSendResult {
  step_number: number;
  channel: string;
  recipient: string;
  status: "sent" | "pending_approval" | "error" | "skipped";
  subject: string;
  email_id?: string;
  message: string;
}

interface EmailSenderDisplayProps {
  results: EmailSendResult[] | null;
  loading?: boolean;
  totalSent?: number;
  totalPending?: number;
  totalErrors?: number;
}

export default function EmailSenderDisplay({
  results,
  loading,
  totalSent = 0,
  totalPending = 0,
  totalErrors = 0,
}: EmailSenderDisplayProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-600">Sending emails...</span>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "pending_approval":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Mail className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-50 border-green-200";
      case "pending_approval":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-700";
      case "pending_approval":
        return "text-yellow-700";
      case "error":
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Sending Results
        </h3>
        <div className="flex gap-2 text-sm">
          {totalSent > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
              Sent: {totalSent}
            </span>
          )}
          {totalPending > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
              Pending: {totalPending}
            </span>
          )}
          {totalErrors > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
              Errors: {totalErrors}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={i}
            className={`border rounded p-3 ${getStatusColor(result.status)}`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(result.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-gray-800">
                    Step {result.step_number}: {result.subject}
                  </h4>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded capitalize ${getStatusText(
                      result.status
                    )}`}
                  >
                    {result.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  To: {result.recipient}
                </p>
                <p className="text-xs text-gray-500">{result.message}</p>
                {result.email_id && (
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {result.email_id}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
