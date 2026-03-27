-- Migration 005: Create retention signals and scoring tables
-- Enables churn prediction, risk assessment, and intervention tracking.

CREATE TABLE IF NOT EXISTS retention_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  
  -- Signal metadata
  source VARCHAR(50) NOT NULL CHECK (source IN ('crm', 'product', 'support', 'email', 'billing')),
  signal_type VARCHAR(100) NOT NULL,
  
  -- Signal value (flexible storage)
  value JSONB NOT NULL,
  
  -- Quality metrics
  reliability_score DECIMAL(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1),
  freshness_hours INT,
  extracted_metadata JSONB,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_signals_userid_account 
  ON retention_signals(userid, account_id);
CREATE INDEX IF NOT EXISTS idx_retention_signals_source 
  ON retention_signals(source);
CREATE INDEX IF NOT EXISTS idx_retention_signals_timestamp 
  ON retention_signals(timestamp DESC);

-- ============================================================================
-- Retention Scores: Account-level risk assessments
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  company_name VARCHAR(500),
  
  -- Contract value
  annual_contract_value DECIMAL(15,2),
  monthly_recurring_revenue DECIMAL(15,2),
  
  -- Risk probabilities (0-1)
  churn_risk_30d DECIMAL(4,3) CHECK (churn_risk_30d >= 0 AND churn_risk_30d <= 1),
  churn_risk_90d DECIMAL(4,3) CHECK (churn_risk_90d >= 0 AND churn_risk_90d <= 1),
  contraction_risk DECIMAL(4,3) CHECK (contraction_risk >= 0 AND contraction_risk <= 1),
  relationship_risk DECIMAL(4,3) CHECK (relationship_risk >= 0 AND relationship_risk <= 1),
  
  -- Assessment
  overall_risk_level VARCHAR(20) CHECK (overall_risk_level IN ('high', 'medium', 'low')),
  confidence_score DECIMAL(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_quality_score DECIMAL(4,3) CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  
  -- Reasons and recommendations
  top_risk_reasons JSONB,
  suggested_interventions JSONB,
  suggested_playbooks JSONB,
  
  -- Metadata
  model_version VARCHAR(50),
  scored_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_scores_userid 
  ON retention_scores(userid);
CREATE INDEX IF NOT EXISTS idx_retention_scores_account_id 
  ON retention_scores(account_id);
CREATE INDEX IF NOT EXISTS idx_retention_scores_overall_risk_level 
  ON retention_scores(overall_risk_level);
CREATE INDEX IF NOT EXISTS idx_retention_scores_updated_at 
  ON retention_scores(updated_at DESC);

-- ============================================================================
-- Interventions: Actions taken to prevent churn
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  
  -- Action definition
  intervention_type VARCHAR(50) NOT NULL CHECK (intervention_type IN ('outreach', 'offer', 'escalation', 'monitor')),
  playbook_id VARCHAR(100) NOT NULL,
  priority VARCHAR(20) CHECK (priority IN ('urgent', 'high', 'normal')),
  
  -- Policy decision
  auto_executable BOOLEAN DEFAULT FALSE,
  confidence_justification TEXT,
  
  -- Execution state
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executing', 'completed', 'failed')),
  assigned_to UUID,
  
  -- Action details
  action_payload JSONB,
  
  -- Outcome
  outcome VARCHAR(50),
  outcome_detail TEXT,
  
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_interventions_userid 
  ON retention_interventions(userid);
CREATE INDEX IF NOT EXISTS idx_retention_interventions_account_id 
  ON retention_interventions(account_id);
CREATE INDEX IF NOT EXISTS idx_retention_interventions_status 
  ON retention_interventions(status);
CREATE INDEX IF NOT EXISTS idx_retention_interventions_created_at 
  ON retention_interventions(created_at DESC);

-- ============================================================================
-- Retention Approvals: Human approval queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  company_name VARCHAR(500),
  annual_contract_value DECIMAL(15,2),
  
  intervention_id UUID NOT NULL REFERENCES retention_interventions(id) ON DELETE CASCADE,
  playbook_id VARCHAR(100) NOT NULL,
  
  -- Context
  churn_risk_level VARCHAR(20) CHECK (churn_risk_level IN ('high', 'medium', 'low')),
  estimated_intervention_cost DECIMAL(15,2),
  estimated_uplift_probability DECIMAL(4,3),
  
  -- Decision
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approval_comment TEXT,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_approvals_userid_status 
  ON retention_approvals(userid, status);
CREATE INDEX IF NOT EXISTS idx_retention_approvals_created_at 
  ON retention_approvals(created_at DESC);

-- ============================================================================
-- Intervention Outcomes: Post-action results for learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES retention_interventions(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  
  -- Outcome classification
  outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN ('saved_account', 'delayed_churn', 'no_effect', 'adverse_effect')),
  confidence DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Metric deltas
  churn_probability_before DECIMAL(4,3),
  churn_probability_after DECIMAL(4,3),
  sentiment_before DECIMAL(4,3),
  sentiment_after DECIMAL(4,3),
  engagement_before DECIMAL(5,2),
  engagement_after DECIMAL(5,2),
  
  -- Customer status at renewal
  customer_status_at_renewal VARCHAR(50) CHECK (customer_status_at_renewal IN ('renewed', 'churned', 'downgraded', 'upgraded', 'pending')),
  
  -- Observation window
  observation_window_days INT,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_outcomes_intervention_id 
  ON retention_intervention_outcomes(intervention_id);
CREATE INDEX IF NOT EXISTS idx_retention_outcomes_account_id 
  ON retention_intervention_outcomes(account_id);
CREATE INDEX IF NOT EXISTS idx_retention_outcomes_outcome_type 
  ON retention_intervention_outcomes(outcome_type);

-- ============================================================================
-- Model Monitoring: Drift and quality metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('auroc', 'pr_auc', 'calibration_error', 'false_positive_rate', 'false_negative_rate')),
  value DECIMAL(6,4),
  
  threshold_acceptable DECIMAL(6,4),
  threshold_warning DECIMAL(6,4),
  
  segment VARCHAR(100),  -- e.g., "enterprise", "usage_declining", "payment_friction"
  
  evaluated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_model_metrics_metric_type 
  ON retention_model_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_retention_model_metrics_evaluated_at 
  ON retention_model_metrics(evaluated_at DESC);

-- ============================================================================
-- KPI Performance: Cohort-level impact
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_cohort_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cohort_id VARCHAR(255) NOT NULL,
  kpi_objective VARCHAR(50) NOT NULL CHECK (kpi_objective IN ('logo_churn', 'revenue_churn', 'expansion', 'response_time')),
  
  primary_kpi_value DECIMAL(8,4),
  control_group_value DECIMAL(8,4),
  
  confidence_interval_lower DECIMAL(8,4),
  confidence_interval_upper DECIMAL(8,4),
  
  sample_size INT,
  observation_window_days INT,
  
  evaluated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_cohort_performance_cohort_id 
  ON retention_cohort_performance(cohort_id);
CREATE INDEX IF NOT EXISTS idx_retention_cohort_performance_kpi_objective 
  ON retention_cohort_performance(kpi_objective);
