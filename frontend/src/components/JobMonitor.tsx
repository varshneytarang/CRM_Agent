import { Zap, CheckCircle2, AlertCircle, Clock, Loader } from "lucide-react";

export interface JobStatus {
  jobId: string;
  status: "processing" | "completed" | "failed" | "not_found";
  progress: number;
  failedReason?: string;
  queueName: string;
  createdAt?: string;
}

interface JobMonitorProps {
  jobs: JobStatus[];
  onRetry?: (jobId: string) => Promise<void>;
  loading?: boolean;
}

export default function JobMonitor({
  jobs,
  onRetry,
}: JobMonitorProps) {
  if (!jobs || jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case "not_found":
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      case "processing":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-200";
      case "failed":
        return "bg-red-200";
      case "processing":
        return "bg-blue-200";
      default:
        return "bg-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Background Jobs
        </h3>
        <span className="text-xs text-gray-500">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className={`border rounded p-3 ${getStatusColor(job.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                {getStatusIcon(job.status)}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-800 text-sm truncate">
                    {job.queueName} Job
                  </h5>
                  <p className="text-xs text-gray-600 truncate">
                    {job.jobId}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded capitalize bg-white">
                {job.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getStatusBgColor(
                    job.status
                  )}`}
                  style={{ width: `${job.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Progress: {job.progress || 0}%
              </p>
            </div>

            {/* Failed Reason */}
            {job.failedReason && (
              <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-700 mb-2">
                {job.failedReason}
              </div>
            )}

            {/* Retry Button */}
            {job.status === "failed" && onRetry && (
              <button
                onClick={() => onRetry(job.jobId)}
                className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry Job
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
