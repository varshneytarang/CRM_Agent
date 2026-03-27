import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "../api";

export type AgentType = "revenue" | "prospecting" | "retention";
export type AgentHealth = "active" | "updating" | "error";
export type RecommendationState = "pending" | "done" | "dismissed" | "later";

interface AgentMetric {
  label: string;
  value: string;
  trend: string;
}

export interface AgentTimelineEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "success";
}

interface AgentPoint {
  label: string;
  value: number;
}

export interface AgentWorkspace {
  id: AgentType;
  name: string;
  role: string;
  status: AgentHealth;
  priority: number;
  summary: string;
  lastActivity: string;
  integrations: string[];
  metrics: AgentMetric[];
  chart: AgentPoint[];
  events: AgentTimelineEvent[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  agentId: AgentType;
  category: "growth" | "retention" | "efficiency";
  impact: "high" | "medium" | "low";
  state: RecommendationState;
  urgent: boolean;
}

interface AgentWorkspaceContextValue {
  agents: AgentWorkspace[];
  recommendations: Recommendation[];
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
  updateRecommendationState: (id: string, state: RecommendationState) => void;
  addTimelineEvent: (agentId: AgentType, event: Omit<AgentTimelineEvent, "id">) => void;
}

const AgentWorkspaceContext = createContext<AgentWorkspaceContextValue | null>(null);

const INITIAL_AGENTS: AgentWorkspace[] = [
  {
    id: "revenue",
    name: "Deal Strategist",
    role: "Pipeline insight and forecast optimization",
    status: "active",
    priority: 2,
    summary: "Monitors deal risk and recommends pricing and sequencing moves.",
    lastActivity: "2m ago",
    integrations: ["HubSpot", "Salesforce", "Gong", "Slack"],
    metrics: [
      { label: "Open Deals", value: "42", trend: "+6 this week" },
      { label: "Win Probability", value: "63%", trend: "+4.1%" },
      { label: "Risk Flags", value: "8", trend: "-2 from yesterday" },
    ],
    chart: [
      { label: "Mon", value: 52 },
      { label: "Tue", value: 54 },
      { label: "Wed", value: 57 },
      { label: "Thu", value: 60 },
      { label: "Fri", value: 63 },
    ],
    events: [
      {
        id: "rev-1",
        time: "09:40",
        title: "Deal batch analyzed",
        detail: "6 strategic interventions suggested for enterprise pipeline.",
        severity: "success",
      },
      {
        id: "rev-2",
        time: "08:55",
        title: "Forecast drift detected",
        detail: "North region pipeline confidence dropped 3.2%.",
        severity: "warning",
      },
    ],
  },
  {
    id: "prospecting",
    name: "Prospecting Copilot",
    role: "Target discovery and personalized outreach",
    status: "updating",
    priority: 1,
    summary: "Builds ICP-fit lead lists and drafts compliant first-touch messaging.",
    lastActivity: "5m ago",
    integrations: ["Apollo", "LinkedIn", "Clearbit", "Gmail"],
    metrics: [
      { label: "New Leads", value: "128", trend: "+18 today" },
      { label: "Reply Rate", value: "21%", trend: "+2.4%" },
      { label: "Ready Drafts", value: "34", trend: "12 high-priority" },
    ],
    chart: [
      { label: "Mon", value: 15 },
      { label: "Tue", value: 17 },
      { label: "Wed", value: 18 },
      { label: "Thu", value: 20 },
      { label: "Fri", value: 21 },
    ],
    events: [
      {
        id: "pro-1",
        time: "09:12",
        title: "ICP refresh complete",
        detail: "Segment weights updated after latest conversion feedback.",
        severity: "info",
      },
      {
        id: "pro-2",
        time: "08:35",
        title: "Compliance pass",
        detail: "32 drafts validated against QA and deliverability rules.",
        severity: "success",
      },
    ],
  },
  {
    id: "retention",
    name: "Retention Advisor",
    role: "Churn detection and intervention playbooks",
    status: "active",
    priority: 3,
    summary: "Flags account churn risk and orchestrates personalized interventions.",
    lastActivity: "Just now",
    integrations: ["Stripe", "Intercom", "Zendesk", "Calendly"],
    metrics: [
      { label: "At-Risk Accounts", value: "17", trend: "-3 this week" },
      { label: "Saved Accounts", value: "11", trend: "+4 this month" },
      { label: "Avg Risk Score", value: "38", trend: "improving" },
    ],
    chart: [
      { label: "Mon", value: 49 },
      { label: "Tue", value: 45 },
      { label: "Wed", value: 43 },
      { label: "Thu", value: 41 },
      { label: "Fri", value: 38 },
    ],
    events: [
      {
        id: "ret-1",
        time: "09:52",
        title: "High-risk alert resolved",
        detail: "Recovery offer accepted by Acme Logistics.",
        severity: "success",
      },
      {
        id: "ret-2",
        time: "09:05",
        title: "Behavior anomaly detected",
        detail: "Usage drop and ticket surge on three SMB accounts.",
        severity: "warning",
      },
    ],
  },
];

const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-1",
    title: "Escalate negotiation support for Apex Retail",
    description: "Deal Strategist predicts a 14% higher close rate if legal response time is reduced.",
    agentId: "revenue",
    category: "growth",
    impact: "high",
    state: "pending",
    urgent: true,
  },
  {
    id: "rec-2",
    title: "Launch persona-specific sequence for Fintech CTOs",
    description: "Prospecting Copilot found an intent spike and drafted 12 tailored emails.",
    agentId: "prospecting",
    category: "efficiency",
    impact: "medium",
    state: "pending",
    urgent: false,
  },
  {
    id: "rec-3",
    title: "Offer quarterly success call to Orbit Ventures",
    description: "Retention Advisor recommends proactive intervention before renewal risk increases.",
    agentId: "retention",
    category: "retention",
    impact: "high",
    state: "pending",
    urgent: true,
  },
  {
    id: "rec-4",
    title: "Pause low-intent outbound segment",
    description: "Current campaign has declining engagement and inflated send volume.",
    agentId: "prospecting",
    category: "efficiency",
    impact: "low",
    state: "later",
    urgent: false,
  },
];

function normalizeStatus(value: string | undefined): AgentHealth {
  if (!value) return "active";
  if (value === "error") return "error";
  if (value === "updating") return "updating";
  return "active";
}

export function AgentWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<AgentWorkspace[]>(INITIAL_AGENTS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(INITIAL_RECOMMENDATIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const addTimelineEvent = useCallback(
    (agentId: AgentType, event: Omit<AgentTimelineEvent, "id">) => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;
          const nextEvent: AgentTimelineEvent = {
            ...event,
            id: `${agentId}-${Date.now()}`,
          };
          return {
            ...agent,
            lastActivity: "moments ago",
            events: [nextEvent, ...agent.events].slice(0, 8),
          };
        })
      );
    },
    []
  );

  const updateRecommendationState = useCallback((id: string, state: RecommendationState) => {
    setRecommendations((prev) => prev.map((item) => (item.id === id ? { ...item, state } : item)));
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dealRes, retentionRes] = await Promise.allSettled([
        api.get("/api/hubspot/unified-dashboard"),
        api.get("/api/retention/dashboard/summary"),
      ]);

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === "revenue" && dealRes.status === "fulfilled") {
            const payload = dealRes.value.data ?? {};
            return {
              ...agent,
              status: normalizeStatus(payload?.systemHealth?.orchestrator),
              metrics: [
                {
                  label: "Open Deals",
                  value: String(payload?.openDeals ?? agent.metrics[0].value),
                  trend: "+live sync",
                },
                {
                  label: "Win Probability",
                  value: `${Math.round((payload?.averageWinRate ?? 0.63) * 100)}%`,
                  trend: "from latest pipeline",
                },
                {
                  label: "Risk Flags",
                  value: String(payload?.flaggedDeals ?? agent.metrics[2].value),
                  trend: "auto-updated",
                },
              ],
            };
          }

          if (agent.id === "retention" && retentionRes.status === "fulfilled") {
            const payload = retentionRes.value.data ?? {};
            return {
              ...agent,
              status: normalizeStatus(payload?.mode === "fallback" ? "updating" : "active"),
              metrics: [
                {
                  label: "At-Risk Accounts",
                  value: String(payload?.at_risk_accounts ?? agent.metrics[0].value),
                  trend: "from retention stream",
                },
                {
                  label: "Saved Accounts",
                  value: String(payload?.saved_accounts ?? agent.metrics[1].value),
                  trend: "this cycle",
                },
                {
                  label: "Avg Risk Score",
                  value: String(payload?.avg_churn_score ?? agent.metrics[2].value),
                  trend: payload?.mode === "fallback" ? "fallback mode" : "real-time",
                },
              ],
            };
          }

          return agent;
        })
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const value = useMemo<AgentWorkspaceContextValue>(
    () => ({
      agents,
      recommendations,
      isRefreshing,
      refreshData,
      updateRecommendationState,
      addTimelineEvent,
    }),
    [addTimelineEvent, agents, isRefreshing, recommendations, refreshData, updateRecommendationState]
  );

  return <AgentWorkspaceContext.Provider value={value}>{children}</AgentWorkspaceContext.Provider>;
}

export function useAgentWorkspace(): AgentWorkspaceContextValue {
  const context = useContext(AgentWorkspaceContext);
  if (!context) {
    throw new Error("useAgentWorkspace must be used within AgentWorkspaceProvider");
  }
  return context;
}
