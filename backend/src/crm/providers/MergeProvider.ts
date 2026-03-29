import axios from "axios";
import mergeClient from "../mergeClient";
import type { Deal } from "../../contracts/deal";
import type { CrmProvider } from "../CrmProvider";

type MergeDeal = {
  id: string;
  name?: string | null;
  title?: string | null;
  amount?: number | null;
  stage?: string | null;
  last_activity_at?: string | null;
  owner?: string | null;
  owner_name?: string | null;
  close_date?: string | null;
  description?: string | null;
  probability?: number | null;
  forecast_category?: string | null;
  forecast_category_name?: string | null;
  next_step?: string | null;
  pipeline?: string | null;
  status?: string | null;
  modified_at?: string | null;
};

type MergeListResponse<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

export class MergeProvider implements CrmProvider {
  constructor(private opts: { apiKey: string }) {}

  private normalizeText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return null;
  }

  private firstText(obj: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = this.normalizeText(obj[key]);
      if (value) return value;
    }
    return null;
  }

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
        res = await mergeClient.get<MergeListResponse<MergeDeal>>(url, { headers });
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

    return res.data.results.map((d) => {
      const raw = d as Record<string, unknown>;
      return {
        id: String(raw.id ?? ""),
        name: this.firstText(raw, ["name", "title", "deal_name"]) ?? "",
        amount: this.normalizeNumber(raw.amount),
        stage: this.firstText(raw, ["stage"]),
        last_activity: this.firstText(raw, ["last_activity_at", "modified_at", "created_at"]),
        owner: this.firstText(raw, ["owner", "owner_name"]),
        close_date: this.firstText(raw, ["close_date"]),
        description: this.firstText(raw, ["description", "body", "content", "text", "notes"]),
        probability: this.normalizeNumber(raw.probability),
        forecast_category: this.firstText(raw, ["forecast_category", "forecast_category_name"]),
        next_step: this.firstText(raw, ["next_step"]),
        pipeline: this.firstText(raw, ["pipeline"]),
        status: this.firstText(raw, ["status"]),
        modified_at: this.firstText(raw, ["modified_at", "last_activity_at", "created_at"]),
      };
    });
  }
}
