// Retention Repository - handles all database operations for retention features
import { Pool, QueryResult } from "pg";
import {
  ChurnScore,
  RetentionIntervention,
  InterventionOutcome,
  RetentionStrategy,
  AccountEngagementMetrics,
  RenewalTracking,
} from "../../contracts/retention";

export class RetentionRepository {
  constructor(private pool: Pool) {}

  // ============================================================================
  // Churn Score Operations
  // ============================================================================

  async saveChurnScore(score: ChurnScore): Promise<ChurnScore> {
    const query = `
      INSERT INTO churn_scores (
        tenant_id, account_id, risk_score, risk_level, key_risk_factors,
        recommendations, engagement_score, usage_trend, feature_adoption_rate,
        renewal_days_remaining, last_login_days_ago, support_ticket_count,
        calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      score.tenantId,
      score.accountId,
      score.riskScore,
      score.riskLevel,
      JSON.stringify(score.keyRiskFactors),
      JSON.stringify(score.recommendations),
      score.engagementScore ?? null,
      score.usageTrend ?? null,
      score.featureAdoptionRate ?? null,
      score.renewalDaysRemaining ?? null,
      score.lastLoginDaysAgo ?? null,
      score.supportTicketCount ?? null,
      score.calculatedAt,
    ]);

    return this.mapChurnScore(result.rows[0]);
  }

  async getLatestChurnScore(tenantId: string, accountId: string): Promise<ChurnScore | null> {
    const query = `
      SELECT * FROM churn_scores
      WHERE tenant_id = $1 AND account_id = $2
      ORDER BY calculated_at DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [tenantId, accountId]);
    return result.rows.length > 0 ? this.mapChurnScore(result.rows[0]) : null;
  }

  async getHighRiskAccounts(
    tenantId: string,
    riskThreshold: number = 0.6,
    limit: number = 20
  ): Promise<ChurnScore[]> {
    const query = `
      SELECT DISTINCT ON (account_id) * FROM churn_scores
      WHERE tenant_id = $1 AND risk_score >= $2
      ORDER BY account_id, calculated_at DESC
      LIMIT $3;
    `;

    const result = await this.pool.query(query, [tenantId, riskThreshold, limit]);
    return result.rows.map((row) => this.mapChurnScore(row));
  }

  async getDashboardMetrics(
    tenantId: string,
    days: number = 30
  ): Promise<{
    totalAtRisk: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    avgScore: number;
  }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE risk_score >= 0.4) as total_at_risk,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_count,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_count,
        AVG(risk_score) as avg_score
      FROM (
        SELECT DISTINCT ON (account_id) * FROM churn_scores
        WHERE tenant_id = $1 AND calculated_at >= NOW() - INTERVAL '1 day'
        ORDER BY account_id, calculated_at DESC
      ) latest_scores;
    `;

    const result = await this.pool.query(query, [tenantId]);
    const row = result.rows[0];

    return {
      totalAtRisk: parseInt(row.total_at_risk, 10),
      criticalCount: parseInt(row.critical_count, 10),
      highCount: parseInt(row.high_count, 10),
      mediumCount: parseInt(row.medium_count, 10),
      avgScore: parseFloat(row.avg_score),
    };
  }

  // ============================================================================
  // Intervention Operations
  // ============================================================================

  async createIntervention(intervention: RetentionIntervention): Promise<RetentionIntervention> {
    const query = `
      INSERT INTO retention_interventions (
        tenant_id, account_id, strategy_id, strategy_name, intervention_type,
        target_outcome, success_probability, estimated_impact, suggested_actions,
        status, executed_by, executed_at, scheduled_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      intervention.tenantId,
      intervention.accountId,
      intervention.strategyId,
      intervention.strategyName,
      intervention.interventionType,
      intervention.targetOutcome ?? null,
      intervention.successProbability ?? null,
      intervention.estimatedImpact ?? null,
      JSON.stringify(intervention.suggestedActions),
      intervention.status,
      intervention.executedBy ?? null,
      intervention.executedAt ?? null,
      intervention.scheduledFor ?? null,
    ]);

    return this.mapIntervention(result.rows[0]);
  }

  async updateInterventionStatus(
    interventionId: string,
    status: RetentionIntervention["status"]
  ): Promise<RetentionIntervention> {
    const query = `
      UPDATE retention_interventions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const result = await this.pool.query(query, [status, interventionId]);
    return this.mapIntervention(result.rows[0]);
  }

  async getInterventionsByAccount(tenantId: string, accountId: string): Promise<RetentionIntervention[]> {
    const query = `
      SELECT * FROM retention_interventions
      WHERE tenant_id = $1 AND account_id = $2
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    const result = await this.pool.query(query, [tenantId, accountId]);
    return result.rows.map((row) => this.mapIntervention(row));
  }

  async getInterventionMetrics(
    tenantId: string,
    days: number = 30
  ): Promise<{ total: number; sent: number; successRate: number }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('sent', 'completed')) as sent,
        COUNT(CASE WHEN io.outcome_status IN ('positive', 'engaged') THEN 1 END)::float /
          NULLIF(COUNT(*), 0) as success_rate
      FROM retention_interventions ri
      LEFT JOIN intervention_outcomes io ON ri.id = io.intervention_id
      WHERE ri.tenant_id = $1 AND ri.created_at >= NOW() - INTERVAL '1 day' * $2;
    `;

    const result = await this.pool.query(query, [tenantId, days]);
    const row = result.rows[0];

    return {
      total: parseInt(row.total, 10),
      sent: parseInt(row.sent, 10),
      successRate: parseFloat(row.success_rate || 0),
    };
  }

  // ============================================================================
  // Intervention Outcome Operations
  // ============================================================================

  async recordOutcome(outcome: InterventionOutcome): Promise<InterventionOutcome> {
    const query = `
      INSERT INTO intervention_outcomes (
        intervention_id, tenant_id, outcome_status, confidence_score,
        email_opened_at, email_clicked_at, response_received_at,
        meeting_attended, engagement_change, churn_risk_change, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      outcome.interventionId,
      outcome.tenantId,
      outcome.outcomeStatus,
      outcome.confidenceScore ?? null,
      outcome.emailOpenedAt ?? null,
      outcome.emailClickedAt ?? null,
      outcome.responseReceivedAt ?? null,
      outcome.meetingAttended ?? false,
      outcome.engagementChange ?? null,
      outcome.churnRiskChange ?? null,
      outcome.notes ?? null,
    ]);

    return this.mapOutcome(result.rows[0]);
  }

  async getOutcomeByIntervention(interventionId: string): Promise<InterventionOutcome | null> {
    const query = `
      SELECT * FROM intervention_outcomes
      WHERE intervention_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [interventionId]);
    return result.rows.length > 0 ? this.mapOutcome(result.rows[0]) : null;
  }

  // ============================================================================
  // Engagement Metrics Operations
  // ============================================================================

  async saveEngagementMetrics(metrics: AccountEngagementMetrics): Promise<AccountEngagementMetrics> {
    const query = `
      INSERT INTO account_engagement_metrics (
        tenant_id, account_id, login_count, active_users, feature_usage_count,
        api_calls, support_tickets, login_trend, usage_trend, features_used,
        new_features_adopted, metric_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id, account_id, metric_date)
      DO UPDATE SET
        login_count = $3, active_users = $4, feature_usage_count = $5,
        api_calls = $6, support_tickets = $7, login_trend = $8,
        usage_trend = $9, features_used = $10, new_features_adopted = $11,
        captured_at = NOW()
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      metrics.tenantId,
      metrics.accountId,
      metrics.loginCount,
      metrics.activeUsers,
      metrics.featureUsageCount,
      metrics.apiCalls,
      metrics.supportTickets,
      metrics.loginTrend ?? null,
      metrics.usageTrend ?? null,
      metrics.featuresUsed,
      metrics.newFeaturesAdopted,
      metrics.metricDate,
    ]);

    return this.mapEngagementMetrics(result.rows[0]);
  }

  async getLatestEngagementMetrics(
    tenantId: string,
    accountId: string
  ): Promise<AccountEngagementMetrics | null> {
    const query = `
      SELECT * FROM account_engagement_metrics
      WHERE tenant_id = $1 AND account_id = $2
      ORDER BY metric_date DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [tenantId, accountId]);
    return result.rows.length > 0 ? this.mapEngagementMetrics(result.rows[0]) : null;
  }

  // ============================================================================
  // Renewal Tracking Operations
  // ============================================================================

  async saveRenewalTracking(renewal: RenewalTracking): Promise<RenewalTracking> {
    const query = `
      INSERT INTO renewal_tracking (
        tenant_id, account_id, contract_start_date, contract_end_date,
        days_until_renewal, renewal_status, annual_contract_value,
        expansion_opportunity, last_renewal_date, next_renewal_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tenant_id, account_id)
      DO UPDATE SET
        contract_start_date = $3, contract_end_date = $4,
        days_until_renewal = $5, renewal_status = $6,
        annual_contract_value = $7, expansion_opportunity = $8,
        last_renewal_date = $9, next_renewal_date = $10,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      renewal.tenantId,
      renewal.accountId,
      renewal.contractStartDate ?? null,
      renewal.contractEndDate ?? null,
      renewal.daysUntilRenewal ?? null,
      renewal.renewalStatus,
      renewal.annualContractValue ?? null,
      renewal.expansionOpportunity ?? null,
      renewal.lastRenewalDate ?? null,
      renewal.nextRenewalDate ?? null,
    ]);

    return this.mapRenewal(result.rows[0]);
  }

  async getRenewalTracking(tenantId: string, accountId: string): Promise<RenewalTracking | null> {
    const query = `
      SELECT * FROM renewal_tracking
      WHERE tenant_id = $1 AND account_id = $2;
    `;

    const result = await this.pool.query(query, [tenantId, accountId]);
    return result.rows.length > 0 ? this.mapRenewal(result.rows[0]) : null;
  }

  // ============================================================================
  // Strategy Operations
  // ============================================================================

  async cacheStrategy(strategy: RetentionStrategy): Promise<RetentionStrategy> {
    const query = `
      INSERT INTO retention_strategies (
        tenant_id, account_id, strategy_id, strategy_name, description,
        target_outcome, suggested_actions, success_probability,
        estimated_impact, timeline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (account_id, strategy_id)
      DO UPDATE SET
        description = $5, target_outcome = $6, suggested_actions = $7,
        success_probability = $8, estimated_impact = $9, timeline = $10,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      strategy.tenantId,
      strategy.accountId,
      strategy.strategyId,
      strategy.strategyName,
      strategy.description ?? null,
      strategy.targetOutcome ?? null,
      JSON.stringify(strategy.suggestedActions),
      strategy.successProbability ?? null,
      strategy.estimatedImpact ?? null,
      strategy.timeline ?? null,
    ]);

    return this.mapStrategy(result.rows[0]);
  }

  async getStrategiesForAccount(tenantId: string, accountId: string): Promise<RetentionStrategy[]> {
    const query = `
      SELECT * FROM retention_strategies
      WHERE tenant_id = $1 AND account_id = $2
      ORDER BY success_probability DESC;
    `;

    const result = await this.pool.query(query, [tenantId, accountId]);
    return result.rows.map((row) => this.mapStrategy(row));
  }

  // ============================================================================
  // Helper Methods - Database Result Mapping
  // ============================================================================

  private mapChurnScore(row: any): ChurnScore {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      riskScore: parseFloat(row.risk_score),
      riskLevel: row.risk_level,
      keyRiskFactors: row.key_risk_factors || [],
      recommendations: row.recommendations || [],
      engagementScore: row.engagement_score ? parseFloat(row.engagement_score) : undefined,
      usageTrend: row.usage_trend ? parseFloat(row.usage_trend) : undefined,
      featureAdoptionRate: row.feature_adoption_rate
        ? parseFloat(row.feature_adoption_rate)
        : undefined,
      renewalDaysRemaining: row.renewal_days_remaining,
      lastLoginDaysAgo: row.last_login_days_ago,
      supportTicketCount: row.support_ticket_count,
      calculatedAt: new Date(row.calculated_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapIntervention(row: any): RetentionIntervention {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      strategyId: row.strategy_id,
      strategyName: row.strategy_name,
      interventionType: row.intervention_type,
      targetOutcome: row.target_outcome,
      successProbability: row.success_probability ? parseFloat(row.success_probability) : undefined,
      estimatedImpact: row.estimated_impact,
      suggestedActions: row.suggested_actions || [],
      status: row.status,
      executedBy: row.executed_by,
      executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : undefined,
      emailId: row.email_id,
      calendarEventId: row.calendar_event_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapOutcome(row: any): InterventionOutcome {
    return {
      id: row.id,
      interventionId: row.intervention_id,
      tenantId: row.tenant_id,
      outcomeStatus: row.outcome_status,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      emailOpenedAt: row.email_opened_at ? new Date(row.email_opened_at) : undefined,
      emailClickedAt: row.email_clicked_at ? new Date(row.email_clicked_at) : undefined,
      responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : undefined,
      meetingAttended: row.meeting_attended,
      engagementChange: row.engagement_change ? parseFloat(row.engagement_change) : undefined,
      churnRiskChange: row.churn_risk_change ? parseFloat(row.churn_risk_change) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapEngagementMetrics(row: any): AccountEngagementMetrics {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      loginCount: row.login_count,
      activeUsers: row.active_users,
      featureUsageCount: row.feature_usage_count,
      apiCalls: row.api_calls,
      supportTickets: row.support_tickets,
      loginTrend: row.login_trend ? parseFloat(row.login_trend) : undefined,
      usageTrend: row.usage_trend ? parseFloat(row.usage_trend) : undefined,
      featuresUsed: row.features_used,
      newFeaturesAdopted: row.new_features_adopted,
      metricDate: new Date(row.metric_date),
      capturedAt: new Date(row.captured_at),
    };
  }

  private mapRenewal(row: any): RenewalTracking {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      contractStartDate: row.contract_start_date ? new Date(row.contract_start_date) : undefined,
      contractEndDate: row.contract_end_date ? new Date(row.contract_end_date) : undefined,
      daysUntilRenewal: row.days_until_renewal,
      renewalStatus: row.renewal_status,
      annualContractValue: row.annual_contract_value
        ? parseFloat(row.annual_contract_value)
        : undefined,
      expansionOpportunity: row.expansion_opportunity
        ? parseFloat(row.expansion_opportunity)
        : undefined,
      lastRenewalDate: row.last_renewal_date ? new Date(row.last_renewal_date) : undefined,
      nextRenewalDate: row.next_renewal_date ? new Date(row.next_renewal_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapStrategy(row: any): RetentionStrategy {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      strategyId: row.strategy_id,
      strategyName: row.strategy_name,
      description: row.description,
      targetOutcome: row.target_outcome,
      suggestedActions: row.suggested_actions || [],
      successProbability: row.success_probability ? parseFloat(row.success_probability) : undefined,
      estimatedImpact: row.estimated_impact,
      timeline: row.timeline,
      timesUsed: row.times_used,
      successfulOutcomes: row.successful_outcomes,
      generatedAt: new Date(row.generated_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default RetentionRepository;
