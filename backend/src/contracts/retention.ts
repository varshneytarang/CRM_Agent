// Retention domain models and database interfaces

export interface ChurnScore {
  id: string;
  tenantId: string;
  accountId: string;
  riskScore: number; // 0.0 to 1.0
  riskLevel: "low" | "medium" | "high" | "critical";
  keyRiskFactors: string[];
  recommendations: string[];

  // Contributing metrics
  engagementScore?: number;
  usageTrend?: number;
  featureAdoptionRate?: number;
  renewalDaysRemaining?: number;
  lastLoginDaysAgo?: number;
  supportTicketCount?: number;

  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionIntervention {
  id: string;
  tenantId: string;
  accountId: string;
  strategyId: string;
  strategyName: string;
  interventionType: "email" | "call" | "meeting" | "discount_offer" | "training" | "custom";

  targetOutcome?: string;
  successProbability?: number;
  estimatedImpact?: string;
  suggestedActions: Array<{ action: string; timeline?: string }>;

  status:
    | "planned"
    | "in_progress"
    | "sent"
    | "scheduled"
    | "completed"
    | "failed"
    | "cancelled";
  executedBy?: string;
  executedAt?: Date;
  scheduledFor?: Date;

  emailId?: string;
  calendarEventId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface InterventionOutcome {
  id: string;
  interventionId: string;
  tenantId: string;

  outcomeStatus: "no_response" | "viewed" | "engaged" | "positive" | "negative" | "churned";
  confidenceScore?: number;

  emailOpenedAt?: Date;
  emailClickedAt?: Date;
  responseReceivedAt?: Date;
  meetingAttended?: boolean;

  engagementChange?: number;
  churnRiskChange?: number;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionStrategy {
  id: string;
  tenantId: string;
  accountId: string;

  strategyId: string;
  strategyName: string;
  description?: string;
  targetOutcome?: string;

  suggestedActions: Array<{ action: string; timeline?: string }>;
  successProbability?: number;
  estimatedImpact?: string;
  timeline?: string;

  timesUsed: number;
  successfulOutcomes: number;

  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountEngagementMetrics {
  id: string;
  tenantId: string;
  accountId: string;

  loginCount: number;
  activeUsers: number;
  featureUsageCount: number;
  apiCalls: number;
  supportTickets: number;

  loginTrend?: number;
  usageTrend?: number;

  featuresUsed: number;
  newFeaturesAdopted: number;

  metricDate: Date;
  capturedAt: Date;
}

export interface RenewalTracking {
  id: string;
  tenantId: string;
  accountId: string;

  contractStartDate?: Date;
  contractEndDate?: Date;
  daysUntilRenewal?: number;

  renewalStatus: "active" | "at_risk" | "up_for_renewal" | "renewed" | "churned";

  annualContractValue?: number;
  expansionOpportunity?: number;

  lastRenewalDate?: Date;
  nextRenewalDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types
export interface CalculateChurnScoreRequest {
  accountId: string;
  tenantId: string;
}

export interface GenerateStrategyRequest {
  accountId: string;
  tenantId: string;
  communicationHistory?: Array<{ date: Date; type: string; content: string }>;
  recentActivity?: Record<string, any>;
  engagementMetrics?: AccountEngagementMetrics;
}

export interface ExecuteInterventionRequest {
  accountId: string;
  tenantId: string;
  strategyId: string;
  executionType: "email" | "call" | "meeting" | "discount_offer";
  executedBy?: string;
  scheduledFor?: Date;
}

export interface DashboardMetrics {
  totalAccountsAtRisk: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  interventionsLast30Days: number;
  avgChurnRiskScore: number;
  topRiskFactors: string[];
  interventionSuccessRate: number;
  dashboardUpdatedAt: Date;
}
