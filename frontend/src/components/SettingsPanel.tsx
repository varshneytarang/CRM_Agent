import { useState } from "react";
import {
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Lock,
  KeyIcon,
  LogOut,
  Bell,
  Database,
  Eye,
  EyeOff,
  Mail,
} from "lucide-react";

export interface UserSettings {
  user_id: string;
  email: string;
  full_name: string;
  company: string;
  phone?: string;
  timezone?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  weekly_digest: boolean;
  auto_engagement: boolean;
  auto_engagement_delay?: number;
}

export interface Integration {
  id: string;
  name: string;
  type: "email" | "calendar" | "crm" | "ai";
  status: "connected" | "disconnected" | "error";
  connected_at?: string;
  last_synced?: string;
  error_message?: string;
}

interface SettingsProps {
  userSettings?: UserSettings;
  integrations?: Integration[];
  loading?: boolean;
  onSaveSettings?: (settings: UserSettings) => Promise<void>;
  onToggleIntegration?: (integrationId: string) => Promise<void>;
  onLogout?: () => Promise<void>;
}

export default function SettingsPanel({
  userSettings,
  integrations,
  loading,
  onSaveSettings,
  onToggleIntegration,
  onLogout,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "integrations" | "notifications" | "security">(
    "profile"
  );
  const [settings, setSettings] = useState<UserSettings | null>(userSettings || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [togglingIntegration, setTogglingIntegration] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    if (!settings || !onSaveSettings) return;

    setIsSaving(true);
    try {
      await onSaveSettings(settings);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleIntegration = async (integrationId: string) => {
    if (!onToggleIntegration) return;

    setTogglingIntegration(integrationId);
    try {
      await onToggleIntegration(integrationId);
    } finally {
      setTogglingIntegration(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-4">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </h3>
          </div>
          <nav className="divide-y divide-gray-200">
            {[
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "integrations", label: "Integrations", icon: "🔗" },
              { id: "notifications", label: "Notifications", icon: "🔔" },
              { id: "security", label: "Security", icon: "🔒" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="lg:col-span-3">
        {/* Profile Settings */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Profile Settings</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update your account information
              </p>
            </div>

            <div className="p-6 space-y-4">
              {settings && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.full_name}
                      onChange={(e) =>
                        setSettings({ ...settings, full_name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to change your email
                    </p>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={settings.company}
                      onChange={(e) =>
                        setSettings({ ...settings, company: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.phone || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone || "UTC"}
                      onChange={(e) =>
                        setSettings({ ...settings, timezone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time (EST)</option>
                      <option value="CST">Central Time (CST)</option>
                      <option value="MST">Mountain Time (MST)</option>
                      <option value="PST">Pacific Time (PST)</option>
                    </select>
                  </div>

                  {/* Save Status */}
                  {saveStatus === "success" && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700">
                        Settings saved successfully
                      </span>
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-700">
                        Failed to save settings
                      </span>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeTab === "integrations" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Integrations</h3>
              <p className="text-sm text-gray-600 mt-1">
                Connect and manage your integrations
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {integrations && integrations.length > 0 ? (
                integrations.map((integration) => (
                  <div key={integration.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {integration.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {integration.type}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          integration.status === "connected"
                            ? "bg-green-100 text-green-700"
                            : integration.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {integration.status === "connected" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {integration.status === "error" && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {integration.status.charAt(0).toUpperCase() +
                          integration.status.slice(1)}
                      </div>
                    </div>

                    {integration.status === "connected" && (
                      <div className="text-xs text-gray-500 space-y-1 mb-4">
                        {integration.connected_at && (
                          <p>
                            Connected:{" "}
                            {new Date(integration.connected_at).toLocaleDateString()}
                          </p>
                        )}
                        {integration.last_synced && (
                          <p>
                            Last synced:{" "}
                            {new Date(integration.last_synced).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {integration.status === "error" && integration.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 mb-4">
                        <p className="text-xs text-red-700">
                          {integration.error_message}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => handleToggleIntegration(integration.id)}
                      disabled={togglingIntegration === integration.id}
                      className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                        integration.status === "connected"
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      } disabled:opacity-50`}
                    >
                      {togglingIntegration === integration.id
                        ? "Processing..."
                        : integration.status === "connected"
                        ? "Disconnect"
                        : "Connect"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No integrations available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage how you receive notifications
              </p>
            </div>

            <div className="p-6 space-y-4">
              {settings && (
                <>
                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Push Notifications
                        </h4>
                        <p className="text-sm text-gray-600">
                          Receive notifications about important events
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications_enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications_enabled: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded text-blue-600"
                    />
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Email Notifications
                        </h4>
                        <p className="text-sm text-gray-600">
                          Receive email notifications
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email_notifications: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded text-blue-600"
                    />
                  </div>

                  {/* Weekly Digest */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Weekly Digest
                        </h4>
                        <p className="text-sm text-gray-600">
                          Get a weekly summary of your activity
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.weekly_digest}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          weekly_digest: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded text-blue-600"
                    />
                  </div>

                  {/* Auto Engagement */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Auto Engagement
                        </h4>
                        <p className="text-sm text-gray-600">
                          Automatically engage with qualified leads
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.auto_engagement}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_engagement: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded text-blue-600"
                    />
                  </div>

                  {/* Auto Engagement Delay */}
                  {settings.auto_engagement && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Auto Engagement Delay (hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="168"
                        value={settings.auto_engagement_delay || 24}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            auto_engagement_delay: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Security</h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account security
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Change Password */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <KeyIcon className="w-5 h-5" /> Change Password
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5" /> Two-Factor Authentication
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Add an extra layer of security to your account
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Enable 2FA
                </button>
              </div>

              {/* Logout */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-red-900 flex items-center gap-2 mb-4">
                  <LogOut className="w-5 h-5" /> Logout
                </h4>
                <p className="text-sm text-red-700 mb-4">
                  Sign out from your account
                </p>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
