import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  CirclePlay,
  CircleX,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeFlowStep, setActiveFlowStep] = useState(0);
  const [demoRunning, setDemoRunning] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [signalBursting, setSignalBursting] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true,
  });
  const [liveData, setLiveData] = useState({
    signals: 124,
    interventions: 18,
    confidence: 92,
  });
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const demoScenes = useMemo(
    () => [
      {
        title: "Scene 1: CRM Pulse",
        subtitle: "HubSpot signals stream in and stale opportunities are highlighted.",
        bullets: [
          "Deals, contacts, and companies synchronize in one board.",
          "Stale opportunities glow for immediate attention.",
          "Teams get one clean source of truth for pipeline state.",
        ],
      },
      {
        title: "Scene 2: Agent Orchestration",
        subtitle: "Prospecting, deal strategy, and retention agents collaborate on priority actions.",
        bullets: [
          "Risk scoring and recommendation generation happen in sequence.",
          "Guardrails and approvals keep actions policy-safe.",
          "Teams see impact and confidence before execution.",
        ],
      },
      {
        title: "Scene 3: Guided Execution",
        subtitle: "Context Assistant summarizes the page and recommends what to do next.",
        bullets: [
          "One-click prompts: Summarize, Where am I, What next.",
          "Operational next steps appear by current workspace context.",
          "Users move from insight to action with minimal friction.",
        ],
      },
    ],
    []
  );

  const featureTiles = useMemo(
    () => [
      {
        id: "agent-mesh",
        title: "Agent Mesh Coordination",
        description: "Prospecting, retention, and revenue agents stay synchronized in one workflow.",
        icon: <Workflow size={18} />,
      },
      {
        id: "live-signals",
        title: "Live CRM Signal Stream",
        description: "HubSpot snapshots and engagement shifts are continuously refreshed.",
        icon: <Activity size={18} />,
      },
      {
        id: "governance",
        title: "Guardrails and Governance",
        description: "Approval checks and policy guardrails keep automation safe.",
        icon: <ShieldCheck size={18} />,
      },
      {
        id: "assistant",
        title: "Contextual Assistant",
        description: "Page-aware guidance recommends the next best action instantly.",
        icon: <Bot size={18} />,
      },
    ],
    []
  );

  const flowSteps = useMemo(
    () => [
      "Capture CRM and engagement data",
      "Score opportunities and churn risk",
      "Generate guided recommendations",
      "Execute interventions with approvals",
    ],
    []
  );

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();

    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal-id]"));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-reveal-id");
            if (!id) return;
            setVisibleSections((prev) => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.18 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || 0);
        ticking = false;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !demoRunning) return;

    const timer = window.setInterval(() => {
      setActiveFlowStep((prev) => (prev + 1) % flowSteps.length);
      setLiveData((prev) => ({
        signals: prev.signals + 3,
        interventions: prev.interventions + (prev.interventions % 2 === 0 ? 1 : 0),
        confidence: Math.min(99, prev.confidence + (prev.confidence < 97 ? 1 : 0)),
      }));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [demoRunning, flowSteps.length, reducedMotion]);

  useEffect(() => {
    if (!demoOpen || reducedMotion || !demoRunning) return;
    const timer = window.setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoScenes.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [demoOpen, demoRunning, demoScenes.length, reducedMotion]);

  useEffect(() => {
    if (!demoOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDemoOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [demoOpen]);

  function revealClass(id: string): string {
    return `landing-v2-reveal ${visibleSections[id] ? "is-visible" : ""}`;
  }

  function revealStyle(order: number): { transitionDelay: string } {
    return { transitionDelay: `${Math.max(0, order) * 110}ms` };
  }

  function triggerSignalBurst() {
    setSignalBursting(true);
    setLiveData((prev) => ({
      signals: prev.signals + 9,
      interventions: prev.interventions + 1,
      confidence: Math.min(99, prev.confidence + 1),
    }));
    window.setTimeout(() => setSignalBursting(false), 320);
  }

  const primaryCtaTo = isAuthenticated ? "/app/dashboard" : "/register";
  const primaryCtaLabel = isAuthenticated ? "Open Command Center" : "Get Started";

  return (
    <div className="landing-v2-shell relative overflow-hidden text-slate-800">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="landing-v2-parallax-layer"
          style={reducedMotion ? undefined : { transform: `translate3d(0, ${Math.min(24, scrollY * 0.04)}px, 0)` }}
        >
          <div className="landing-v2-gradient" />
        </div>
        <div
          className="landing-v2-parallax-layer"
          style={reducedMotion ? undefined : { transform: `translate3d(0, ${Math.min(34, scrollY * 0.06)}px, 0)` }}
        >
          <div className="landing-v2-wave" />
        </div>
        <div
          className="landing-v2-parallax-layer"
          style={reducedMotion ? undefined : { transform: `translate3d(0, ${Math.min(18, scrollY * 0.03)}px, 0)` }}
        >
          <div className="landing-v2-particles" />
        </div>
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

      <main className="ds-container relative z-10 space-y-12 py-8 md:space-y-14 md:py-10">
        <section
          data-reveal-id="hero"
          style={revealStyle(0)}
          className={`landing-v2-hero ds-panel-strong p-6 md:p-8 ${revealClass("hero")}`}
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="ds-kicker">Revenue Intelligence Platform</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">Calm AI for confident revenue decisions.</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                Unify CRM signals, risk scoring, and guided recommendations into one modern workspace for sales and
                customer teams.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={primaryCtaTo} className="ds-btn ds-btn-dark landing-v2-cta-primary landing-v2-cta-focus">
                  {primaryCtaLabel}
                  <ChevronRight size={16} />
                </Link>
                <button
                  type="button"
                  className="landing-v2-inline-demo"
                  onClick={() => {
                    setDemoOpen(true);
                    setDemoStep(0);
                  }}
                >
                  <CirclePlay size={16} />
                  Watch interactive preview
                </button>
              </div>
            </div>

            <div className="landing-v2-hero-stage">
              <div className={`landing-v2-demo-card ${demoRunning ? "is-running" : ""} ${signalBursting ? "is-bursting" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Live-Like Activity</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="landing-v2-hotspot-btn"
                      onClick={triggerSignalBurst}
                      title="Trigger quick signal burst"
                    >
                      <Sparkles size={13} />
                      Signal Burst
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700"
                      onClick={() => setDemoRunning((prev) => !prev)}
                    >
                      {demoRunning ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                      {demoRunning ? "Pause" : "Play"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <MetricChip label="Signals" value={liveData.signals} />
                  <MetricChip label="Interventions" value={liveData.interventions} />
                  <MetricChip label="Confidence" value={`${liveData.confidence}%`} />
                </div>

                <div className="mt-4 space-y-2">
                  {flowSteps.map((step, idx) => (
                    <div key={step} className="landing-v2-step-row">
                      <span className={`landing-v2-step-dot ${idx === activeFlowStep ? "is-active" : ""}`} />
                      <p className={`text-sm ${idx === activeFlowStep ? "text-slate-800" : "text-slate-500"}`}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="landing-v2-divider" aria-hidden="true" />

        <section data-reveal-id="features" style={revealStyle(1)} className={revealClass("features")}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={17} className="text-cyan-700" />
            <h2 className="text-2xl font-semibold text-slate-900">Core Contributions</h2>
          </div>
          <p className="mb-5 max-w-3xl text-sm text-slate-600">
            A clean set of capabilities designed for fast, low-friction decisions.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureTiles.map((feature) => (
              <article key={feature.id} className="landing-v2-feature-card">
                <span className="landing-v2-feature-icon">{feature.icon}</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="landing-v2-divider" aria-hidden="true" />

        <section data-reveal-id="workflow" style={revealStyle(2)} className={revealClass("workflow")}>
          <div className="mb-4 flex items-center gap-2">
            <Workflow size={17} className="text-cyan-700" />
            <h2 className="text-2xl font-semibold text-slate-900">How It Works</h2>
          </div>

          <div className="landing-v2-workflow-grid">
            {flowSteps.map((step, idx) => (
              <div key={step} className={`landing-v2-workflow-tile ${idx === activeFlowStep ? "is-active" : ""}`}>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Step {idx + 1}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{step}</p>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="landing-v2-progress"
                    style={{ width: `${((idx + 1) / flowSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="landing-v2-divider" aria-hidden="true" />

        <section data-reveal-id="analytics" style={revealStyle(3)} className={revealClass("analytics")}>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={17} className="text-cyan-700" />
            <h2 className="text-2xl font-semibold text-slate-900">Dynamic Data Showcase</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="landing-v2-analytics-card">
              <p className="text-sm font-semibold text-slate-800">Pipeline Coverage</p>
              <div className="mt-4 space-y-3">
                <ProgressBar label="Opportunity freshness" value={Math.min(98, liveData.confidence)} />
                <ProgressBar label="Recommendation readiness" value={Math.min(96, liveData.confidence - 4)} />
                <ProgressBar label="Intervention completion" value={Math.min(93, liveData.confidence - 8)} />
              </div>
            </div>

            <div className="landing-v2-analytics-card">
              <p className="text-sm font-semibold text-slate-800">Simulated Agent Updates</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="landing-v2-log-row">Deal Strategist flagged 2 opportunities for immediate review.</li>
                <li className="landing-v2-log-row">Retention Advisor suggested one proactive outreach intervention.</li>
                <li className="landing-v2-log-row">Context Assistant summarized next actions for the current page.</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="landing-v2-divider" aria-hidden="true" />

        <section
          data-reveal-id="final"
          style={revealStyle(4)}
          className={`landing-v2-final ds-panel p-6 md:p-7 ${revealClass("final")}`}
        >
          <h2 className="text-3xl font-semibold text-slate-900">Ready to operate with AI-guided clarity?</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Keep pipeline, retention, and recommendations connected with a modern interface designed for fast decisions and calm execution.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/app/dashboard" className="ds-btn ds-btn-primary">
                  Open Command Center
                </Link>
                <Link to="/app/summary" className="ds-btn ds-btn-secondary">
                  Review Summary
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="ds-btn ds-btn-primary">
                  Create Account
                </Link>
                <Link to="/login" className="ds-btn ds-btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/70 bg-white/70 backdrop-blur-sm">
        <div className="ds-container py-8 md:py-10">
          <div className="landing-v2-footer-grid">
            <div>
              <p className="text-lg font-semibold text-slate-900">CRM Agent</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                A professional command center for CRM intelligence, risk visibility, and AI-guided execution across
                prospecting, retention, and revenue operations.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="landing-v2-footer-pill">HubSpot Connected</span>
                <span className="landing-v2-footer-pill">Approval Workflows</span>
                <span className="landing-v2-footer-pill">Context Assistant</span>
              </div>
            </div>

            <div>
              <p className="landing-v2-footer-heading">Platform</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link to="/app/dashboard" className="landing-v2-footer-link">
                  Command Center
                </Link>
                <Link to="/app/hubspot" className="landing-v2-footer-link">
                  HubSpot Insights
                </Link>
                <Link to="/app/summary" className="landing-v2-footer-link">
                  Executive Summary
                </Link>
              </div>
            </div>

            <div>
              <p className="landing-v2-footer-heading">Access</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {isAuthenticated ? (
                  <>
                    <Link to="/app/settings" className="landing-v2-footer-link">
                      Workspace Settings
                    </Link>
                    <button type="button" onClick={handleLogout} className="landing-v2-footer-link text-left">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="landing-v2-footer-link">
                      Create Account
                    </Link>
                    <Link to="/login" className="landing-v2-footer-link">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="landing-v2-footer-heading">Trust</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <span className="text-slate-600">Policy-aware agent guardrails</span>
                <span className="text-slate-600">Review and approval checkpoints</span>
                <a className="landing-v2-footer-link" href="mailto:support@crm-agent.local">
                  support@crm-agent.local
                </a>
              </div>
            </div>
          </div>

          <div className="landing-v2-footer-bottom mt-8 pt-4">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} CRM Agent. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <a href="#" className="landing-v2-footer-meta-link">
                Privacy
              </a>
              <a href="#" className="landing-v2-footer-meta-link">
                Terms
              </a>
              <a href="#" className="landing-v2-footer-meta-link">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>

      {demoOpen && (
        <div className="landing-v2-demo-overlay" role="dialog" aria-modal="true" aria-label="Interactive demo">
          <div className="landing-v2-demo-modal motion-rise">
            <div className="landing-v2-demo-glow" aria-hidden="true" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="ds-kicker">Interactive Story Demo</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{demoScenes[demoStep].title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{demoScenes[demoStep].subtitle}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                  onClick={() => setDemoOpen(false)}
                  title="Close interactive demo"
                >
                  <CircleX size={18} />
                </button>
              </div>

              <div className="mt-5 landing-v2-scene-stage">
                <div className={`landing-v2-scene-card scene-${demoStep + 1}`}>
                  <div className="landing-v2-scene-orb orb-a" />
                  <div className="landing-v2-scene-orb orb-b" />
                  <div className="landing-v2-scene-lines" />
                  <div className="landing-v2-scene-core" />
                </div>

                <div className="landing-v2-scene-copy">
                  <ul className="space-y-2 text-sm text-slate-700">
                    {demoScenes[demoStep].bullets.map((bullet) => (
                      <li key={bullet} className="landing-v2-scene-bullet">
                        <span className="landing-v2-scene-bullet-dot" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
                  {demoScenes.map((scene, idx) => (
                    <button
                      key={scene.title}
                      type="button"
                      onClick={() => setDemoStep(idx)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        demoStep === idx ? "bg-cyan-50 text-cyan-800" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary"
                    onClick={() => setDemoStep((prev) => (prev - 1 + demoScenes.length) % demoScenes.length)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn-dark"
                    onClick={() => setDemoStep((prev) => (prev + 1) % demoScenes.length)}
                  >
                    Next Scene
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn-soft"
                    onClick={() => setDemoRunning((prev) => !prev)}
                  >
                    {demoRunning ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    {demoRunning ? "Pause Auto-Play" : "Resume Auto-Play"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="landing-v2-chip">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="landing-v2-progress h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
