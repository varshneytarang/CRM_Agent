-- Retention database schema
-- Tracks churn scores, interventions, and outcomes

-- Table: churn_scores
-- Stores calculated churn risk scores for accounts
CREATE TABLE IF NOT EXISTS churn_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  risk_score DECIMAL(3, 2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  key_risk_factors JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Metrics that contributed to the score
  engagement_score DECIMAL(3, 2),
  usage_trend DECIMAL(3, 2),
  feature_adoption_rate DECIMAL(3, 2),
  renewal_days_remaining INTEGER,
  last_login_days_ago INTEGER,
  support_ticket_count INTEGER,
  
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, account_id, calculated_at)
);

CREATE INDEX idx_churn_scores_tenant_account ON churn_scores(tenant_id, account_id);
CREATE INDEX idx_churn_scores_risk_level ON churn_scores(tenant_id, risk_level);
CREATE INDEX idx_churn_scores_calculated_at ON churn_scores(tenant_id, calculated_at DESC);


-- Table: retention_interventions
-- Tracks retention interventions executed for accounts
CREATE TABLE IF NOT EXISTS retention_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  strategy_id VARCHAR(255) NOT NULL,
  strategy_name VARCHAR(255) NOT NULL,
  intervention_type VARCHAR(50) NOT NULL CHECK (intervention_type IN ('email', 'call', 'meeting', 'discount_offer', 'training', 'custom')),
  
  -- LLM-generated or selected intervention details
  target_outcome TEXT,
  success_probability DECIMAL(3, 2),
  estimated_impact TEXT,
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  
  -- Execution details
  status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'sent', 'scheduled', 'completed', 'failed', 'cancelled')),
  executed_by VARCHAR(255),  -- User ID or system
  executed_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  
  -- Related records
  email_id VARCHAR(255),  -- Reference to sent email
  calendar_event_id VARCHAR(255),  -- Reference to calendar meeting
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interventions_tenant_account ON retention_interventions(tenant_id, account_id);
CREATE INDEX idx_interventions_status ON retention_interventions(tenant_id, status);
CREATE INDEX idx_interventions_created_at ON retention_interventions(tenant_id, created_at DESC);
CREATE INDEX idx_interventions_account_strategy ON retention_interventions(account_id, strategy_id);


-- Table: intervention_outcomes
-- Tracks results and effectiveness of interventions
CREATE TABLE IF NOT EXISTS intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES retention_interventions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Outcome tracking
  outcome_status VARCHAR(50) NOT NULL CHECK (outcome_status IN ('no_response', 'viewed', 'engaged', 'positive', 'negative', 'churned')),
  confidence_score DECIMAL(3, 2),  -- How confident we are in this outcome
  
  -- Engagement signals
  email_opened_at TIMESTAMP,
  email_clicked_at TIMESTAMP,
  response_received_at TIMESTAMP,
  meeting_attended BOOLEAN,
  
  -- Impact metrics
  engagement_change DECIMAL(3, 2),  -- Change in engagement score post-intervention
  churn_risk_change DECIMAL(3, 2),  -- Change in churn risk post-intervention
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outcomes_intervention ON intervention_outcomes(intervention_id);
CREATE INDEX idx_outcomes_tenant ON intervention_outcomes(tenant_id);
CREATE INDEX idx_outcomes_outcome_status ON intervention_outcomes(tenant_id, outcome_status);


-- Table: retention_strategies
-- Caches generated strategies for accounts
CREATE TABLE IF NOT EXISTS retention_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  
  strategy_id VARCHAR(255) NOT NULL,
  strategy_name VARCHAR(255) NOT NULL,
  description TEXT,
  target_outcome TEXT,
  
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  success_probability DECIMAL(3, 2),
  estimated_impact TEXT,
  timeline VARCHAR(50),
  
  -- Effectiveness tracking
  times_used INTEGER DEFAULT 0,
  successful_outcomes INTEGER DEFAULT 0,
  
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(account_id, strategy_id)
);

CREATE INDEX idx_strategies_tenant_account ON retention_strategies(tenant_id, account_id);
CREATE INDEX idx_strategies_success_probability ON retention_strategies(success_probability DESC);


-- Table: account_engagement_metrics
-- Hourly/daily snapshot of account engagement metrics
CREATE TABLE IF NOT EXISTS account_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  
  -- Engagement metrics
  login_count INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  feature_usage_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  support_tickets INTEGER DEFAULT 0,
  
  -- Usage trend (week-over-week change)
  login_trend DECIMAL(4, 2),  -- Percentage change
  usage_trend DECIMAL(4, 2),  -- Percentage change
  
  -- Feature adoption
  features_used INTEGER DEFAULT 0,
  new_features_adopted INTEGER DEFAULT 0,
  
  -- Updates
  metric_date DATE NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, account_id, metric_date)
);

CREATE INDEX idx_engagement_tenant_account ON account_engagement_metrics(tenant_id, account_id);
CREATE INDEX idx_engagement_metric_date ON account_engagement_metrics(tenant_id, metric_date DESC);


-- Table: renewal_tracking
-- Tracks contract renewal information
CREATE TABLE IF NOT EXISTS renewal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  
  -- Renewal dates
  contract_start_date DATE,
  contract_end_date DATE,
  days_until_renewal INTEGER,
  
  -- Renewal status
  renewal_status VARCHAR(50) DEFAULT 'active' CHECK (renewal_status IN ('active', 'at_risk', 'up_for_renewal', 'renewed', 'churned')),
  
  -- Deal values
  annual_contract_value DECIMAL(12, 2),
  expansion_opportunity DECIMAL(12, 2),
  
  last_renewal_date DATE,
  next_renewal_date DATE,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, account_id)
);

CREATE INDEX idx_renewal_tenant_account ON renewal_tracking(tenant_id, account_id);
CREATE INDEX idx_renewal_next_date ON renewal_tracking(next_renewal_date);
