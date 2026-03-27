import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "./auth";
import { getAccountToken, hasAccountToken, setAccountToken } from "../store/accountTokens";

export const mergeRouter = Router();

/**
 * Helper to extract readable errors from Merge API responses
 */
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

    if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    
    if (Array.isArray(data.non_field_errors)) {
      const merged = data.non_field_errors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("; ");
      if (merged) return merged;
    }
  }

  return "";
}

/**
 * 1. Generate a Link Token to initialize the Merge Link UI
 */
mergeRouter.post("/link-token", requireAuth, async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const authUser = (req as any).user;
    const {
      end_user_origin_id,
      end_user_organization_name,
      end_user_email_address,
    } = req.body ?? {};

    // Use provided origin ID or fallback to user ID + timestamp
    const userId = String(authUser?.userid ?? "");
    const resolvedOriginId = (typeof end_user_origin_id === "string" ? end_user_origin_id.trim() : "") 
      || `${userId}:${Date.now()}`;

    if (!userId) {
      return res.status(401).json({ error: "User context missing" });
    }

    const payload = {
      end_user_origin_id: resolvedOriginId,
      end_user_organization_name: end_user_organization_name ?? authUser?.username ?? "Organization",
      end_user_email_address: end_user_email_address ?? authUser?.email ?? "user@example.com",
      categories: ["crm"], // Adjust categories as needed
    };

    const linkTokenRes = await axios.post(
      "https://api.merge.dev/api/integrations/create-link-token",
      payload,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return res.json({
      link_token: linkTokenRes.data.link_token,
      end_user_origin_id: resolvedOriginId,
    });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const message = extractUpstreamError(err?.response?.data) || err.message || "Link token creation failed";
    return res.status(status).json({ error: message });
  }
});

/**
 * 2. Exchange public_token for a long-lived account_token
 */
mergeRouter.post("/account-token", requireAuth, async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const authUser = (req as any).user;
    const { public_token, end_user_origin_id } = req.body ?? {};
    
    const userId = String(authUser?.userid ?? "");
    const resolvedOriginId = String(end_user_origin_id ?? "").trim();

    if (!public_token) return res.status(400).json({ error: "public_token is required" });
    if (!resolvedOriginId) return res.status(400).json({ error: "end_user_origin_id is required" });

    // Security: Ensure the origin ID belongs to the logged-in user
    if (!userId || !(resolvedOriginId === userId || resolvedOriginId.startsWith(`${userId}:`))) {
      return res.status(403).json({ error: "Unauthorized: origin_id mismatch" });
    }

    // FIX: Merge uses POST for account token exchange, not GET
    const accountTokenRes = await axios.post(
      `https://api.merge.dev/api/integrations/account-token/${public_token}`,
      {}, // Empty body
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const account_token = accountTokenRes.data.account_token;
    if (!account_token) {
      return res.status(502).json({ error: "Merge did not return account_token" });
    }

    // Quick verification: call a lightweight Merge endpoint using the returned account_token
    try {
      await axios.get("https://api.merge.dev/api/crm/v1/opportunities", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Account-Token": account_token,
        },
        timeout: 5000,
      });
    } catch (verifyErr: any) {
      const msg = extractUpstreamError(verifyErr?.response?.data) || verifyErr?.message || "Invalid account_token";
      return res.status(400).json({ error: `Account token verification failed: ${msg}` });
    }

    // Save to database
    await setAccountToken(userId, account_token, resolvedOriginId);

    return res.json({ account_token, success: true });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const message = extractUpstreamError(err?.response?.data) || err.message || "Account token exchange failed";
    return res.status(status).json({ error: message });
  }
});

/**
 * 3. Retrieve existing token from your DB
 */
mergeRouter.get("/account-token", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = String(authUser?.userid ?? "");
    
    // Fixed: Corrected variable names that were undefined
    const queryOriginId = String(req.query.end_user_origin_id ?? "").trim();
    const externalAccountId = String(req.query.external_account_id ?? "").trim() || undefined;

    // Security check
    if (queryOriginId && queryOriginId !== userId && !queryOriginId.startsWith(`${userId}:`)) {
      return res.status(403).json({ error: "Unauthorized access to origin ID" });
    }

    const token = await getAccountToken(userId, externalAccountId);
    return res.json({ account_token: token ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve token" });
  }
});

/**
 * 4. Check if user has any active connections
 */
mergeRouter.get("/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = String(authUser?.userid ?? "");
    
    if (!userId) return res.status(400).json({ error: "User ID missing" });

    const connected = await hasAccountToken(userId);
    return res.json({ connected });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to fetch status" });
  }
});