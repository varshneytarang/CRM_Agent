import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { getAccountToken, setAccountToken } from "../store/accountTokens";

export const mergeRouter = Router();

function extractUpstreamError(responseData: unknown): string {
  if (typeof responseData === "string") {
    return responseData.trim();
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as {
      error?: unknown;
      detail?: unknown;
      message?: unknown;
      non_field_errors?: unknown;
    };

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (Array.isArray(data.non_field_errors)) {
      const merged = data.non_field_errors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("; ");
      if (merged) {
        return merged;
      }
    }
  }

  return "";
}

mergeRouter.post("/link-token", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const {
      end_user_origin_id,
      end_user_organization_name,
      end_user_email_address,
    } = req.body ?? {};

    if (!end_user_origin_id) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const payload = {
      end_user_origin_id,
      end_user_organization_name: end_user_organization_name ?? "Demo Org",
      end_user_email_address: end_user_email_address ?? "demo@example.com",
      categories: ["crm"],
    };

    const linkTokenRes = await axios.post(
      "https://api.merge.dev/api/integrations/create-link-token",
      payload,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return res.json({ link_token: linkTokenRes.data.link_token });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const responseText = extractUpstreamError(responseData);
    const message =
      responseText ||
      err?.response?.statusText ||
      err?.message ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});

mergeRouter.post("/account-token", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const { public_token, end_user_origin_id } = req.body ?? {};
    if (!public_token) {
      return res.status(400).json({ error: "public_token is required" });
    }
    if (!end_user_origin_id) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const accountTokenRes = await axios.get(
      `https://api.merge.dev/api/integrations/account-token/${public_token}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const account_token = accountTokenRes.data.account_token as
      | string
      | undefined;
    if (!account_token) {
      return res
        .status(502)
        .json({ error: "Merge did not return account_token" });
    }

    await setAccountToken(end_user_origin_id, account_token);

    return res.json({ account_token });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const responseText = extractUpstreamError(responseData);
    const message =
      responseText ||
      err?.response?.statusText ||
      err?.message ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});

mergeRouter.get("/account-token", async (req: Request, res: Response) => {
  const endUserOriginId = String(req.query.end_user_origin_id ?? "");
  if (!endUserOriginId) {
    return res
      .status(400)
      .json({ error: "end_user_origin_id query param is required" });
  }

  try {
    const token = await getAccountToken(endUserOriginId);
    return res.json({ account_token: token ?? null });
  } catch (err: any) {
    const message =
      err?.message || "Failed to retrieve token";
    return res.status(500).json({ error: message });
  }
});
