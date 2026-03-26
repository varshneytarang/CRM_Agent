import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type TiltState = {
  x: number;
  y: number;
};

export function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [tilt, setTilt] = useState<TiltState>({ x: 0, y: 0 });

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function handlePanelMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (py - 0.5) * 16,
      y: (px - 0.5) * -16,
    });
  }

  function resetPanelMove() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div className="ds-shell relative overflow-hidden text-slate-800">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-h-lines" />
        <div className="landing-v-lines" />
        <div className="landing-orb landing-orb-a" />
        <div className="landing-orb landing-orb-b" />
      </div>

      <header className="relative z-10 border-b border-white/40 backdrop-blur-sm">
        <div className="ds-container flex items-center justify-between py-4">
          <p className="text-lg font-semibold tracking-wide text-slate-900">CRM Agent</p>
          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="rounded-full bg-white/70 px-3 py-1 text-slate-700">{user?.username}</span>
                <button onClick={handleLogout} className="ds-btn ds-btn-secondary ds-btn-pill">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="ds-btn ds-btn-soft ds-btn-pill">
                  Sign In
                </Link>
                <Link to="/register" className="ds-btn ds-btn-primary ds-btn-pill">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="ds-container relative z-10 grid min-h-[calc(100vh-73px)] grid-cols-1 gap-8 py-8 lg:grid-cols-[1.2fr_1fr] lg:items-stretch">
        <section className="ds-panel-strong p-8">
          <p className="ds-kicker">Adaptive Prospecting</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Unified Interface,
            <br />
            Intelligent Revenue Execution
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            A calm and modern command center for discovery, scoring, personalization, and engagement signals.
            Enter through dedicated login/register pages, then manage everything in one connected workspace.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="ds-panel p-4">
              <p className="text-2xl font-semibold text-cyan-800">Fluid</p>
              <p className="text-sm text-cyan-700">Horizontal + vertical flow</p>
            </div>
            <div className="ds-panel p-4">
              <p className="text-2xl font-semibold text-teal-800">Safe</p>
              <p className="text-sm text-teal-700">Guardrails and QA first</p>
            </div>
            <div className="ds-panel p-4">
              <p className="text-2xl font-semibold text-sky-800">Live</p>
              <p className="text-sm text-sky-700">Signals and approvals</p>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/hubspot-dashboard" className="ds-btn ds-btn-dark">
                  Open Dashboard
                </Link>
                <Link to="/onboarding" className="ds-btn ds-btn-secondary">
                  Continue Setup
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="ds-btn ds-btn-dark">
                  Sign In
                </Link>
                <Link to="/register" className="ds-btn ds-btn-secondary">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <div
            onMouseMove={handlePanelMove}
            onMouseLeave={resetPanelMove}
            className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_24px_50px_rgba(66,112,138,0.12)] backdrop-blur-md"
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 180ms ease-out",
            }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-sky-200/40 blur-2xl" />
            <p className="relative z-10 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Interactive Motion Grid
            </p>
            <div className="relative z-10 mt-4 grid grid-cols-4 gap-3">
              <div className="landing-tile landing-tile-intense col-span-2 h-16" />
              <div className="landing-tile landing-tile-intense h-16" />
              <div className="landing-tile landing-tile-intense h-16" />
              <div className="landing-tile landing-tile-intense h-24" />
              <div className="landing-tile landing-tile-intense col-span-2 h-24" />
              <div className="landing-tile landing-tile-intense h-24" />
            </div>
            <p className="relative z-10 mt-4 text-sm text-slate-600">
              A subtle, tactile preview of how panels adapt across desktop and mobile surfaces.
            </p>
          </div>

          <div className="ds-panel p-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              {isAuthenticated ? "Session Ready" : "Start With Auth"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isAuthenticated
                ? "Jump directly into dashboards, prospecting flows, and approval queues."
                : "Use the dedicated login or register pages, then return to this board with your live session."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link to="/hubspot-dashboard" className="ds-btn ds-btn-primary">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="ds-btn ds-btn-primary">
                    Open Login
                  </Link>
                  <Link to="/register" className="ds-btn ds-btn-secondary">
                    Open Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
