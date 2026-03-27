import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  Menu,
  PanelsTopLeft,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAgentWorkspace } from "../../context/AgentWorkspaceContext";
import { ContextChatAssistant } from "./ContextChatAssistant";

function titleFromPath(pathname: string): string {
  if (pathname.includes("/summary")) return "Summary and Recommendations";
  if (pathname.includes("/hubspot")) return "HubSpot Full Insights";
  if (pathname.includes("/agents/")) return "Agent Workspace";
  if (pathname.includes("/settings")) return "Workspace Settings";
  return "Dashboard";
}

function statusDot(status: "active" | "updating" | "error"): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "updating") return "bg-amber-500";
  return "bg-rose-500";
}

export function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { agents, recommendations } = useAgentWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("crm_shell_collapsed") === "true");
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationCount = recommendations.filter((item) => item.urgent && item.state === "pending").length;
  const pageTitle = titleFromPath(location.pathname);

  const navItems = useMemo(
    () => [
      { to: "/app/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { to: "/app/hubspot", label: "HubSpot", icon: <Building2 size={18} /> },
      { to: "/app/summary", label: "Summary", icon: <ListChecks size={18} /> },
      { to: "/app/settings", label: "Settings", icon: <ShieldCheck size={18} /> },
    ],
    []
  );

  return (
    <div className="ds-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/92 p-4 backdrop-blur transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "lg:w-24" : "lg:w-72"}`}
        >
          <div className="flex items-center justify-between">
            <Link to="/app/dashboard" className="inline-flex items-center gap-2 text-slate-900">
              <span className="rounded-xl bg-cyan-600 p-2 text-white">
                <PanelsTopLeft size={18} />
              </span>
              {!collapsed && <span className="text-sm font-semibold">CRM Agent Hub</span>}
            </Link>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-500 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.icon}
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            {!collapsed && <p className="px-2 text-xs uppercase tracking-[0.18em] text-slate-500">Agents</p>}
            <div className="mt-2 space-y-1">
              {agents.map((agent) => (
                <NavLink
                  key={agent.id}
                  to={`/app/agents/${agent.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDot(agent.status)}`} />
                  {!collapsed && (
                    <span className="truncate">
                      {agent.name}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem("crm_shell_collapsed", String(next));
            }}
            className="mt-6 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            title="Collapse sidebar"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/25 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar backdrop"
          />
        )}

        <main className="min-h-screen flex-1 p-3 md:p-5">
          <header className="ds-panel mb-5 flex flex-wrap items-center justify-between gap-3 p-3 md:p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                title="Open menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current View</p>
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/app/summary"
                className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                title="Open notifications and urgent recommendations"
              >
                <Bell size={16} />
                Alerts
                {notificationCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {notificationCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  title="Open profile menu"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 font-semibold text-cyan-700">
                    {(user?.username?.[0] ?? "U").toUpperCase()}
                  </span>
                  <span className="hidden sm:block">{user?.username ?? "User"}</span>
                  <ChevronDown size={14} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <Link
                      to="/app/settings"
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => setProfileOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setProfileOpen(false);
                        void logout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <Outlet />
          {location.pathname.includes("/app/") && <ContextChatAssistant />}
        </main>
      </div>
    </div>
  );
}
