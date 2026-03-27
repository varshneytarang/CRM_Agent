import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronUp, Clock3, XCircle } from "lucide-react";
import { useAgentWorkspace } from "../../context/AgentWorkspaceContext";

export function FloatingActionPanel() {
  const { recommendations, updateRecommendationState } = useAgentWorkspace();
  const [open, setOpen] = useState(false);

  const urgentRecommendations = useMemo(
    () => recommendations.filter((item) => item.urgent && item.state === "pending").slice(0, 3),
    [recommendations]
  );

  if (urgentRecommendations.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))]">
      {open && (
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-900">Urgent Recommendations</h3>
          <ul className="mt-3 space-y-3">
            {urgentRecommendations.map((item) => (
              <li key={item.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    onClick={() => updateRecommendationState(item.id, "done")}
                  >
                    <CheckCircle2 size={13} />
                    Done
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                    onClick={() => updateRecommendationState(item.id, "later")}
                  >
                    <Clock3 size={13} />
                    Later
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                    onClick={() => updateRecommendationState(item.id, "dismissed")}
                  >
                    <XCircle size={13} />
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Quick Checklist</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>Confirm owner for each urgent item</li>
              <li>Attach expected impact before execution</li>
              <li>Schedule follow-up review in summary page</li>
            </ul>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="ml-auto inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700"
        title="Toggle urgent actions panel"
      >
        <AlertTriangle size={16} />
        {open ? "Hide" : "Urgent Actions"}
        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{urgentRecommendations.length}</span>
        <ChevronUp size={14} className={open ? "" : "rotate-180"} />
      </button>
    </div>
  );
}
