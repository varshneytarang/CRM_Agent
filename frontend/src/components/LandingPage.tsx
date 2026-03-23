import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex justify-between items-center">
          <p className="text-lg font-semibold text-cyan-300">CRM Agent</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">Welcome, {user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 rounded border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-slate-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-5xl flex-col justify-center px-6 py-14">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">CRM Agent</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Unified CRM Intelligence Dashboard
        </h1>
        <p className="mt-5 max-w-2xl text-sm text-slate-300 sm:text-base">
          Connect your CRM through Merge API, view all your deals, opportunities and contacts,
          and run AI-powered risk analysis across your entire pipeline.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/hubspot-dashboard"
            className="rounded-md bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            📊 Open Dashboard
          </Link>
          <a
            href="/health"
            className="rounded-md border border-slate-700 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500"
          >
            🏥 Backend Health
          </a>
        </div>

        {/* Quick Tips */}
        <div className="mt-16 space-y-4">
          <h2 className="text-xl font-semibold">Quick Tips:</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start">
              <span className="mr-3 text-cyan-300">→</span>
              <span>Go to the dashboard to connect your CRM or view existing connections</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-cyan-300">→</span>
              <span>Your data is encrypted and securely stored</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-cyan-300">→</span>
              <span>Run analysis on your pipeline to get risk scores on deals</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
