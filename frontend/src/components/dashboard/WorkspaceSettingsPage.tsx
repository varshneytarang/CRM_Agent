import { useAuth } from "../../context/AuthContext";

export function WorkspaceSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong p-5 md:p-6">
        <p className="ds-kicker">Profile</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Workspace Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage account details and communication preferences for this workspace.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="ds-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">User Information</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Username</p>
              <p className="mt-1 font-medium">{user?.username ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
              <p className="mt-1 font-medium">{user?.email ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Organization</p>
              <p className="mt-1 font-medium">{user?.org_name ?? "-"}</p>
            </div>
          </div>
        </article>

        <article className="ds-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span>Daily summary email</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-cyan-600" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span>Urgent alert notifications</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-cyan-600" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span>Auto-refresh dashboard every 5 minutes</span>
              <input type="checkbox" className="h-4 w-4 accent-cyan-600" />
            </label>
          </div>
        </article>
      </section>
    </div>
  );
}
