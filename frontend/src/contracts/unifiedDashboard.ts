import type { Deal } from "./deal";

export interface CrmRecord {
  id: string;
  name: string;
  amount: number | null;
  stage: string | null;
  email: string | null;
  phone: string | null;
  owner: string | null;
  last_activity: string | null;
}

export interface UnifiedDashboardSummary {
  total_deals: number;
  total_opportunities: number;
  total_contacts: number;
  total_companies: number;
  total_engagements: number;
  total_amount: number;
  stale_deals: number;
}

export interface UnifiedDashboardResponse {
  source: string;
  fetched_at: string;
  summary: UnifiedDashboardSummary;
  deals: Deal[];
  opportunities: CrmRecord[];
  contacts: CrmRecord[];
  companies: CrmRecord[];
  engagements: CrmRecord[];
  warnings: string[];
}
