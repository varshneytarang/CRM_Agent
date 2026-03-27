import { useMemo, useState } from "react";
import { Bot, MessageSquareText, Send, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAgentWorkspace } from "../../context/AgentWorkspaceContext";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function currentPageLabel(pathname: string): string {
  if (pathname.includes("/hubspot")) return "HubSpot Full Insights";
  if (pathname.includes("/summary")) return "Summary and Recommendations";
  if (pathname.includes("/agents/")) return "Agent Workspace";
  if (pathname.includes("/settings")) return "Workspace Settings";
  return "Dashboard";
}

function buildActionHints(pathname: string): string[] {
  if (pathname.includes("/hubspot")) {
    return [
      "Review stale deals first and assign owners.",
      "Open high-value deals and log next-step notes.",
      "Use dashboard cards to return to agent-level prioritization.",
    ];
  }
  if (pathname.includes("/summary")) {
    return [
      "Mark pending recommendations as Done or Later.",
      "Escalate high-impact items with urgent flags.",
      "Open the related agent page for execution context.",
    ];
  }
  if (pathname.includes("/agents/")) {
    return [
      "Trigger a manual action and monitor timeline updates.",
      "Check integrations and trend panel for drift.",
      "Return to Summary to close recommendation loops.",
    ];
  }
  if (pathname.includes("/settings")) {
    return [
      "Confirm notification preferences for urgent alerts.",
      "Verify organization and profile metadata.",
      "Return to Dashboard to monitor card outcomes.",
    ];
  }

  return [
    "Open HubSpot full insights from snapshot cards.",
    "Use Focus mode to isolate Performance or Risk cards.",
    "Open a card to drill into the related full-page view.",
  ];
}

export function ContextChatAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { agents, recommendations, hubspotSnapshot } = useAgentWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const page = currentPageLabel(location.pathname);

  const summaryText = useMemo(() => {
    const activeAgents = agents.filter((agent) => agent.status === "active").length;
    const pendingRecommendations = recommendations.filter((item) => item.state === "pending").length;
    const urgentRecommendations = recommendations.filter((item) => item.urgent && item.state === "pending").length;
    const deals = hubspotSnapshot?.summary?.total_deals ?? 0;
    const staleDeals = hubspotSnapshot?.summary?.stale_deals ?? 0;

    return [
      `You are on ${page}.`,
      `Agents: ${agents.length} total, ${activeAgents} active.`,
      `Recommendations: ${pendingRecommendations} pending, ${urgentRecommendations} urgent.`,
      `HubSpot: ${deals} deals, ${staleDeals} stale.`,
    ].join(" ");
  }, [agents, hubspotSnapshot, page, recommendations]);

  const hints = useMemo(() => buildActionHints(location.pathname), [location.pathname]);

  const quickActions = useMemo(
    () => [
      { id: "qa-summary", label: "Summarize this page", prompt: "Summarize data on this page" },
      { id: "qa-next", label: "What next?", prompt: "What should I do next?" },
      { id: "qa-location", label: "Where am I?", prompt: "Where am I currently?" },
      {
        id: "qa-open-hubspot",
        label: "Open HubSpot page",
        prompt: "Take me to HubSpot full page",
      },
    ],
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I can summarize this page, explain current data, and suggest next actions. Ask: 'Where am I?', 'Summarize data', or 'What should I do next?'.",
    },
  ]);

  function assistantReply(question: string): string {
    const text = question.toLowerCase();

    if (text.includes("where") || text.includes("page") || text.includes("am i")) {
      return `You are currently on ${page}. ${summaryText}`;
    }

    if (text.includes("summ") || text.includes("data") || text.includes("status")) {
      return `Current snapshot: ${summaryText}`;
    }

    if (text.includes("next") || text.includes("action") || text.includes("what should")) {
      return `Recommended next actions:\n1. ${hints[0]}\n2. ${hints[1]}\n3. ${hints[2]}`;
    }

    return `I can help with page context, data summary, and next actions. Quick summary: ${summaryText}`;
  }

  async function submitQuestion(overridePrompt?: string) {
    const trimmed = (overridePrompt ?? input).trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (trimmed.toLowerCase().includes("hubspot") && trimmed.toLowerCase().includes("open")) {
      navigate("/app/hubspot");
    }

    setIsSending(true);
    try {
      const response = await api.post("/api/prospecting/chat", {
        message: trimmed,
        context: {
          current_page: page,
          pathname: location.pathname,
          summary: summaryText,
          next_actions: hints,
          agents: agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            key_metrics: agent.metrics,
          })),
          recommendations: {
            pending: recommendations.filter((item) => item.state === "pending").length,
            urgent: recommendations.filter((item) => item.urgent && item.state === "pending").length,
          },
          hubspot: hubspotSnapshot?.summary ?? null,
        },
      });

      const reply = String(response.data?.reply ?? "").trim();
      const botMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: reply || assistantReply(trimmed),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const fallbackMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: `${assistantReply(trimmed)} (Live assistant is temporarily unavailable, so this is a local fallback.)`,
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-1.6rem))]">
      {open && (
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Bot size={16} className="text-cyan-700" />
              Context Assistant
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              title="Close assistant"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl px-3 py-2 text-xs leading-5 ${
                  message.role === "assistant"
                    ? "border border-cyan-100 bg-cyan-50/70 text-slate-700"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] text-slate-500">Try: "Summarize data" or "What next?"</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitQuestion();
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500"
                placeholder="Ask about this page or next steps"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={() => void submitQuestion()}
                className="inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 disabled:opacity-60"
                title="Send question"
                disabled={isSending}
              >
                <Send size={14} />
              </button>
            </div>
            {isSending && <p className="mt-2 text-[11px] text-slate-500">Thinking with live context...</p>}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="ml-auto inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-cyan-700"
        title="Open contextual assistant"
      >
        <MessageSquareText size={16} />
        {open ? "Hide Assistant" : "Assistant"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-md backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={isSending}
                onClick={() => void submitQuestion(action.prompt)}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60"
                title={action.label}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
