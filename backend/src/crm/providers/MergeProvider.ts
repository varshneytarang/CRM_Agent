import axios from "axios";
import type { Deal } from "../../contracts/deal";
import type { CrmProvider } from "../CrmProvider";

type MergeDeal = {
  id: string;
  name: string | null;
  amount: number | null;
  stage: string | null;
  last_activity_at?: string | null;
};

type MergeListResponse<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

export class MergeProvider implements CrmProvider {
  constructor(private opts: { apiKey: string }) {}

  async listDeals(params: { accountToken: string }): Promise<Deal[]> {
    const headers = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      "X-Account-Token": params.accountToken,
    };

    const endpoints = [
      "https://api.merge.dev/api/crm/v1/opportunities",
      "https://api.merge.dev/api/crm/v1/deals",
    ];

    let lastError: unknown;
    let res: { data: MergeListResponse<MergeDeal> } | undefined;

    for (const url of endpoints) {
      try {
        res = await axios.get<MergeListResponse<MergeDeal>>(url, { headers });
        break;
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          throw err;
        }
        lastError = err;
      }
    }

    if (!res) {
      throw lastError ?? new Error("No supported Merge CRM endpoint found");
    }

    return res.data.results.map((d) => ({
      id: d.id,
      name: d.name ?? "",
      amount: d.amount ?? null,
      stage: d.stage ?? null,
      last_activity: d.last_activity_at ?? null,
    }));
  }
}
