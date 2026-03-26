import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader,
} from "lucide-react";

export interface ApprovalRequest {
  id: string;
  userid: string;
  lead_email: string;
  lead_name: string;
  sequence_json: Record<string, any>;
  status: "pending" | "approved" | "rejected";
  action?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

interface ApprovalGateProps {
  approvals: ApprovalRequest[];
  onApprove?: (id: string, comment: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  loading?: boolean;
}

export default function ApprovalGate({
  approvals,
  onApprove,
  onReject,
}: ApprovalGateProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const processedApprovals = approvals.filter((a) => a.status !== "pending");

  const handleApprove = async (id: string) => {
    if (!onApprove) return;
    setActionLoading(id);
    try {
      await onApprove(id, comment);
      setComment("");
      setExpandedId(null);
    } catch (error) {
      console.error("Error approving:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!onReject) return;
    setActionLoading(id);
    try {
      await onReject(id, rejectReason);
      setRejectReason("");
      setShowRejectForm(false);
      setExpandedId(null);
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Approval Requests
        </h3>
        <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded">
          {pendingApprovals.length} Pending
        </span>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Awaiting Decision
          </h4>
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="border border-yellow-200 bg-yellow-50 rounded p-3"
            >
              <div
                className="cursor-pointer flex items-center justify-between"
                onClick={() =>
                  setExpandedId(
                    expandedId === approval.id ? null : approval.id
                  )
                }
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <h5 className="font-medium text-gray-800">
                      {approval.lead_name}
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600">{approval.lead_email}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {approval.created_at && new Date(approval.created_at).toLocaleDateString()}
                </span>
              </div>

              {expandedId === approval.id && (
                <div className="mt-4 pt-4 border-t border-yellow-200 space-y-3">
                  {/* Sequence Preview */}
                  <div>
                    <h6 className="text-sm font-semibold text-gray-700 mb-2">
                      Sequence:
                    </h6>
                    {approval.sequence_json.steps && (
                      <div className="space-y-1 bg-white rounded p-2">
                        {approval.sequence_json.steps.map(
                          (step: any, i: number) => (
                            <div key={i} className="text-xs text-gray-600">
                              <span className="font-medium">Step {step.step}:</span>{" "}
                              {step.channel.toUpperCase()} -{" "}
                              {step.subject || step.body?.substring(0, 30)}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!showRejectForm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={actionLoading === approval.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === approval.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full text-sm border border-gray-300 rounded p-2"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(approval.id)}
                          disabled={!rejectReason || actionLoading === approval.id}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          {actionLoading === approval.id ? (
                            <Loader className="w-4 h-4 animate-spin inline mr-2" />
                          ) : null}
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectForm(false);
                            setRejectReason("");
                          }}
                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comment input */}
                  {!showRejectForm && (
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment (optional)..."
                      className="w-full text-sm border border-gray-300 rounded p-2"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Processed Approvals */}
      {processedApprovals.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-800">
            History ({processedApprovals.length})
          </summary>
          <div className="mt-2 space-y-2">
            {processedApprovals.map((approval) => (
              <div
                key={approval.id}
                className={`border rounded p-2 text-sm ${
                  approval.status === "approved"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h6 className="font-medium text-gray-800">
                      {approval.lead_name}
                    </h6>
                    <p className="text-xs text-gray-600">{approval.lead_email}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded capitalize ${
                      approval.status === "approved"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {approval.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
