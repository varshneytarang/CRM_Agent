import { useState } from "react";
import {
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  Code,
  Copy,
  Check,
} from "lucide-react";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  created_at: string;
  last_modified: string;
}

interface EmailTemplateBuilderProps {
  templates: EmailTemplate[];
  loading?: boolean;
  onSave?: (template: Partial<EmailTemplate>) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
  onSelect?: (template: EmailTemplate) => void;
}

interface TemplateFormState {
  id?: string;
  name: string;
  subject: string;
  body: string;
}

export default function EmailTemplateBuilder({
  templates,
  loading,
  onSave,
  onDelete,
  onSelect,
}: EmailTemplateBuilderProps) {
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<TemplateFormState>({
    name: "",
    subject: "",
    body: "",
  });

  const handleNewTemplate = () => {
    setFormState({ name: "", subject: "", body: "" });
    setSelectedTemplate(null);
    setIsEditingForm(true);
    setShowPreview(false);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setFormState({
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setSelectedTemplate(template);
    setIsEditingForm(true);
    setShowPreview(false);
  };

  const handleCancel = () => {
    setIsEditingForm(false);
    setFormState({ name: "", subject: "", body: "" });
    setSelectedTemplate(null);
  };

  const handleSave = async () => {
    if (!formState.name.trim() || !formState.subject.trim() || !formState.body.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(formState);
      setIsEditingForm(false);
      setFormState({ name: "", subject: "", body: "" });
      setSelectedTemplate(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!onDelete) return;
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await onDelete(templateId);
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      alert("Failed to delete template");
    }
  };

  const extractVariables = (text: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const variables = extractVariables(
    formState.subject + " " + formState.body
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template List */}
      {!isEditingForm && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Email Templates</h3>
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          {templates && templates.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedTemplate?.id === template.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    if (onSelect) onSelect(template);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 break-words">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 break-words">
                        Subject: {template.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Modified: {new Date(template.last_modified).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No templates created yet
            </div>
          )}
        </div>
      )}

      {/* Template Editor Form */}
      {isEditingForm && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {selectedTemplate ? "Edit Template" : "New Template"}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) =>
                  setFormState({ ...formState, name: e.target.value })
                }
                placeholder="e.g., Initial Outreach"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formState.subject}
                onChange={(e) =>
                  setFormState({ ...formState, subject: e.target.value })
                }
                placeholder="e.g., Exciting opportunity for {{company_name}}"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={formState.body}
                onChange={(e) =>
                  setFormState({ ...formState, body: e.target.value })
                }
                placeholder="Hi {{first_name}},&#10;&#10;We have an exciting opportunity for {{company_name}}...&#10;&#10;Best regards"
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use double braces to insert variables: {`{{variable_name}}`}
              </p>
            </div>

            {/* Variables */}
            {variables.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Detected Variables:
                </p>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="border border-gray-200 rounded p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">Preview</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      From
                    </p>
                    <p className="text-sm text-gray-700">Agent Email</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Subject
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formState.subject || "(empty)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Body
                    </p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mt-2 bg-white p-3 rounded border border-gray-200">
                      {formState.body || "(empty)"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? "Edit" : "Preview"}
              </button>

              <button
                onClick={() =>
                  copyToClipboard(formState.body, "Body copied!")
                }
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                {copyFeedback === "Body copied!" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy Body
              </button>

              <div className="flex-1" />

              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Panel */}
      {selectedTemplate && !isEditingForm && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              {selectedTemplate.name}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Subject
              </h4>
              <p className="text-gray-900 font-semibold">
                {selectedTemplate.subject}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Body
              </h4>
              <div className="bg-gray-50 rounded p-4 border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
                {selectedTemplate.body}
              </div>
            </div>

            {extractVariables(
              selectedTemplate.subject + " " + selectedTemplate.body
            ).length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Variables Used:
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractVariables(
                    selectedTemplate.subject + " " + selectedTemplate.body
                  ).map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => handleEditTemplate(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => handleDelete(selectedTemplate.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
