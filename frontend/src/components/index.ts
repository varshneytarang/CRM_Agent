// Main components
export { default as SignalMonitor } from "./SignalMonitor";
export type { EngagementSignal } from "./SignalMonitor";

export { default as ProspectList } from "./ProspectList";
export type { Prospect } from "./ProspectList";

export { default as PipelineView } from "./PipelineView";
export type { PipelineStage, PipelineMetrics } from "./PipelineView";

export { default as EmailTemplateBuilder } from "./EmailTemplateBuilder";
export type { EmailTemplate } from "./EmailTemplateBuilder";

export { default as SettingsPanel } from "./SettingsPanel";
export type { UserSettings, Integration } from "./SettingsPanel";

export { default as AnalyticsDashboard } from "./AnalyticsDashboard";
export type { AnalyticsData } from "./AnalyticsDashboard";

export { default as HelpCenter } from "./HelpCenter";
export type { FAQItem, GuideSection } from "./HelpCenter";

export { default as GuardrailsDisplay } from "./GuardrailsDisplay";
export { default as ApprovalGate } from "./ApprovalGate";
export type { ApprovalRequest } from "./ApprovalGate";
export { default as JobMonitor } from "./JobMonitor";
export type { JobStatus } from "./JobMonitor";
export { default as EmailSenderDisplay } from "./EmailSenderDisplay";
export { default as ProspectingResults } from "./ProspectingResults";

// Existing components
export { LandingPage } from "./LandingPage";
export { Login } from "./Login";
export { Register } from "./Register";
export { Onboarding } from "./Onboarding";
export { PipelineDashboard } from "./PipelineDashboard";
export { default as ProspectingChatDock } from "./ProspectingChatDock";
export { ProtectedRoute } from "./ProtectedRoute";
