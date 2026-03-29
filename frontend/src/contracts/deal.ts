export interface Deal {
  id: string;
  name: string;
  amount: number | null;
  stage: string | null;
  last_activity: string | null;
  owner: string | null;
  close_date: string | null;
  description: string | null;
  probability: number | null;
  forecast_category: string | null;
  next_step: string | null;
  pipeline: string | null;
  status: string | null;
  modified_at: string | null;
}
