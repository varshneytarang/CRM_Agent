import { useState } from "react";
import {
  ChevronDown,
  Mail,
  Phone,
  Link2,
  ExternalLink,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  status: "new" | "contacted" | "engaged" | "qualified" | "lost";
  fit_score?: number;
  last_engagement?: string;
  tags?: string[];
}

interface ProspectListProps {
  prospects: Prospect[];
  loading?: boolean;
  onSelect?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => Promise<void>;
  onEdit?: (prospect: Prospect) => void;
  selectedProspectId?: string;
}

interface ExpandedState {
  [prospectId: string]: boolean;
}

export default function ProspectList({
  prospects,
  loading,
  onSelect,
  onDelete,
  onEdit,
  selectedProspectId,
}: ProspectListProps) {
  const [expandedProspects, setExpandedProspects] = useState<ExpandedState>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleExpanded = (prospectId: string) => {
    setExpandedProspects((prev) => ({
      ...prev,
      [prospectId]: !prev[prospectId],
    }));
  };

  const handleDelete = async (prospectId: string) => {
    if (!onDelete) return;

    setDeleting(prospectId);
    try {
      await onDelete(prospectId);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "contacted":
        return "bg-yellow-100 text-yellow-700";
      case "engaged":
        return "bg-purple-100 text-purple-700";
      case "qualified":
        return "bg-green-100 text-green-700";
      case "lost":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "qualified") {
      return <CheckCircle className="w-4 h-4" />;
    } else if (status === "lost") {
      return <AlertCircle className="w-4 h-4" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-center text-gray-500">Loading prospects...</div>
      </div>
    );
  }

  if (!prospects || prospects.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No prospects found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Prospects</h3>
        <span className="text-sm text-gray-500">{prospects.length} prospects</span>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-200">
        {prospects.map((prospect) => {
          const isExpanded = expandedProspects[prospect.id];
          const isSelected = selectedProspectId === prospect.id;

          return (
            <div
              key={prospect.id}
              className={`transition-colors ${
                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              {/* Main Row */}
              <div className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Expand Button */}
                    <button
                      onClick={() => toggleExpanded(prospect.id)}
                      className="mt-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                      aria-label="Toggle details"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Prospect Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {prospect.first_name} {prospect.last_name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${getStatusColor(
                            prospect.status
                          )}`}
                        >
                          {getStatusIcon(prospect.status)}
                          {prospect.status.charAt(0).toUpperCase() +
                            prospect.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {prospect.title} at {prospect.company}
                      </p>

                      {/* Fit Score if available */}
                      {prospect.fit_score !== undefined && (
                        <div className="mt-1 flex items-center gap-1">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, prospect.fit_score))}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {prospect.fit_score.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(prospect)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        aria-label="Edit prospect"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(prospect.id)}
                        disabled={deleting === prospect.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        aria-label="Delete prospect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {onSelect && (
                      <button
                        onClick={() => onSelect(prospect)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {/* Contact Information */}
                    <div className="grid grid-cols-2 gap-4">
                      {prospect.email && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                          </p>
                          <a
                            href={`mailto:${prospect.email}`}
                            className="text-sm text-blue-600 hover:underline break-all"
                          >
                            {prospect.email}
                          </a>
                        </div>
                      )}
                      {prospect.phone && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone
                          </p>
                          <a
                            href={`tel:${prospect.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {prospect.phone}
                          </a>
                        </div>
                      )}
                      {prospect.linkedin_url && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> LinkedIn
                          </p>
                          <a
                            href={prospect.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">
                            Website
                          </p>
                          <a
                            href={prospect.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
                          >
                            {prospect.website}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Last Engagement */}
                    {prospect.last_engagement && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">
                          Last Engagement
                        </p>
                        <p className="text-sm text-gray-700">
                          {new Date(prospect.last_engagement).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {prospect.tags && prospect.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {prospect.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
