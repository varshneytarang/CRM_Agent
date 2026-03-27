/**
 * Retention Agent Data Contracts
 * Core types for churn prediction, risk scoring, and intervention workflows.
 */

export type RiskLevel = "high" | "medium" | "low";
export type KPIObjective = "logo_churn" | "revenue_churn" | "expansion" | "response_time";
export type InterventionType = "outreach" | "offer" | "escalation" | "monitor";
export type InterventionStatus = "pending" | "approved" | "rejected" | "executing" | "completed" | "failed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SignalSource = "crm" | "product" | "support" | "email" | "billing";

/**
 * Retention Signal: normalized event from any source.
 */
export interface RetentionSignal {
  id: string;
  userid: string;
  account_id: string;
  source: SignalSource;
  signal_type: string; // e.g., "usage_drop", "support_ticket", "sentiment_negative", "payment_failed"
  value: number | string | Record<string, unknown>;
  reliability_score: number; // 0-1: how much to trust this signal
  freshness_hours: number; // how recent (0 = <1h, 24 = <1d, etc)
  timestamp: string;
  created_at: string;
  extracted_metadata?: Record<string, unknown>;
}

/**
 * Account Feature Vector: aggregated account state for scoring.
 */
export interface AccountFeatureVector {
  account_id: string;
  company_name: string;
  annual_contract_value: number;
  monthly_recurring_revenue: number;
  support_tier: "enterprise" | "professional" | "standard" | "free";
  
  // Usage signals (30d window)
  days_since_last_login: number;
  feature_adoption_score: number; // 0-100
  api_call_volume_trend: "rising" | "stable" | "declining";
  
  // Engagement signals
  support_ticket_count_30d: number;
  avg_resolution_time_hours: number;
  customer_satisfaction_score: number | null; // 0-10
  executive_sponsor_engagement: "high" | "medium" | "low";
  
  // Financial signals
  days_until_renewal: number;
  payment_failures_30d: number;
  pricing_friction_detected: boolean;
  
  // Contextual
  is_multi_product_user: boolean;
  competitor_signals: string[];
  
  computed_at: string;
}

/**
 * Retention Score: risk assessment output.
 */
export interface RetentionScore {
  id: string;
  userid: string;
  account_id: string;
  company_name: string;
  annual_contract_value: number;
  
  // Risk probabilities (0-1)
  churn_risk_30d: number;
  churn_risk_90d: number;
  contraction_risk: number;
  relationship_risk: number;
  
  // Overall assessment
  overall_risk_level: RiskLevel;
  confidence_score: number; // 0-1: model confidence
  data_quality_score: number; // 0-1: how complete/reliable the signals are
  
  // Top drivers (reason codes)
  top_risk_reasons: Array<{
    code: string;
    label: string;
    impact_score: number; // 0-1 relative importance
  }>;
  
  // Recommendations
  suggested_interventions: InterventionType[];
  suggested_playbooks: string[]; // ["high-touch-outreach", "executive-reconnect", etc]
  
  // Metadata
  model_version: string;
  scored_at: string;
  updated_at: string;
}

/**
 * Intervention: action to prevent churn.
 */
export interface RetentionIntervention {
  id: string;
  userid: string;
  account_id: string;
  
  // Action definition
  intervention_type: InterventionType;
  playbook_id: string; // e.g., "high-touch-outreach", "renewal-discount"
  priority: "urgent" | "high" | "normal";
  
  // Policy decision
  auto_executable: boolean; // true = auto-run, false = requires approval
  confidence_justification: string;
  
  // Execution
  status: InterventionStatus;
  assigned_to?: string; // CSM/AM userid if escalation
  
  // Action payload
  action_payload: Record<string, unknown>; // {template_id, suggested_offer, context, etc}
  
  // Outcome tracking
  executed_at?: string;
  outcome?: "success" | "failed" | "pending";
  outcome_detail?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Retention Approval Request: human approval for high-risk interventions.
 */
export interface RetentionApprovalRequest {
  id: string;
  userid: string;
  account_id: string;
  company_name: string;
  annual_contract_value: number;
  
  intervention_id: string;
  playbook_id: string;
  
  // Context for approval decision
  churn_risk_level: RiskLevel;
  estimated_intervention_cost: number;
  estimated_uplift_probability: number;
  
  // Decision
  status: ApprovalStatus;
  approved_by?: string;
  approval_comment?: string;
  approval_at?: string;
  
  created_at: string;
}

/**
 * Intervention Outcome: result tracking for learning.
 */
export interface InterventionOutcome {
  id: string;
  intervention_id: string;
  account_id: string;
  
  // Post-action state
  outcome_type: "saved_account" | "delayed_churn" | "no_effect" | "adverse_effect";
  confidence: number; // 0-1
  
  // Metrics shift
  churn_probability_before: number;
  churn_probability_after: number;
  sentiment_before: number | null;
  sentiment_after: number | null;
  engagement_before: number;
  engagement_after: number;
  
  // Whether they renewed or left
  customer_status_at_renewal: "renewed" | "churned" | "downgraded" | "upgraded" | "pending";
  
  observation_window_days: number; // how long post-action we observed
  recorded_at: string;
}

/**
 * Retention Simulator: what-if impact analysis.
 */
export interface RetentionSimulationRequest {
  account_id: string;
  intervention_scenarios: Array<{
    playbook_id: string;
    estimated_cost: number;
  }>;
}

export interface RetentionSimulationResult {
  account_id: string;
  scenarios: Array<{
    playbook_id: string;
    estimated_impact: {
      churn_probability_delta: number; // negative = less likely to churn
      expected_uplift: number;
      confidence_interval: [number, number];
      estimated_cost: number;
      net_value: number;
    };
    risk_assessment: string;
  }>;
}

/**
 * Model Monitoring: drift and quality metrics.
 */
export interface RetentionModelMetrics {
  metric_type: "auroc" | "pr_auc" | "calibration_error" | "false_positive_rate" | "false_negative_rate";
  value: number;
  threshold_acceptable: number;
  threshold_warning: number;
  evaluated_at: string;
  segment?: string; // optional: by company size, industry, tier
}

/**
 * Cohort Performance: aggregate KPI impact.
 */
export interface CohortPerformanceMetrics {
  cohort_id: string;
  kpi_objective: KPIObjective;
  primary_kpi_value: number; // e.g., retention rate %, NRR %
  control_group_value?: number; // for A/B test
  confidence_interval: [number, number];
  sample_size: number;
  observation_window_days: number;
  evaluated_at: string;
}
