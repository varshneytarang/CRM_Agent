import express, { Router, Request, Response } from "express";
import { saveEngagementSignal } from "../db/repositories/engagementRepository";
import { submitSignalJob } from "../jobs/queue";

// Minimal auth middleware for webhook replay endpoint
const requireAuth = (req: Request, res: Response, next: Function) => {
  // TODO: Implement proper auth validation
  // For now, just ensure request is valid
  next();
};

const webhookRouter = Router();

/**
 * Verify webhook signature (provider-specific)
 * For production, implement proper HMAC verification per provider docs
 */
function verifyWebhookSignature(
  provider: string,
  signature: string,
  body: string
): boolean {
  // TODO: Implement proper signature verification for each provider
  // For now, accept all valid JSON payloads
  return true;
}

/**
 * POST /api/webhooks/email
 * Webhook endpoint for email provider events (opens, clicks, replies, bounces)
 *
 * Expected payload:
 * {
 *   "provider": "resend" | "sendgrid",
 *   "lead_email": "target@example.com",
 *   "event_type": "open" | "click" | "reply" | "bounce",
 *   "event_data": { ... provider-specific data ... },
 *   "api_key": "user's secret API key for verification"
 * }
 */
webhookRouter.post("/email", async (req: Request, res: Response) => {
  try {
    const {
      provider,
      lead_email,
      event_type,
      event_data,
      api_key,
    } = req.body;

    if (!provider || !lead_email || !event_type || !event_data || !api_key) {
      return res.status(400).json({
        error: "Missing required fields: provider, lead_email, event_type, event_data, api_key",
      });
    }

    if (!["resend", "sendgrid", "mailgun", "postmark"].includes(provider)) {
      return res.status(400).json({
        error: "Invalid provider. Must be one of: resend, sendgrid, mailgun, postmark",
      });
    }

    if (!["open", "click", "reply", "bounce", "unsubscribe", "complaint"].includes(event_type)) {
      return res.status(400).json({
        error: "Invalid event_type. Must be one of: open, click, reply, bounce, unsubscribe, complaint",
      });
    }

    // Verify webhook signature (TODO: Implement proper verification)
    // const isValid = verifyWebhookSignature(provider, signature, JSON.stringify(req.body));
    // if (!isValid) {
    //   return res.status(401).json({ error: "Invalid webhook signature" });
    // }

    // TODO: Look up userid from api_key (or use auth context)
    // For now, extract from request (in production, use token validation)
    const userid = (req as any).user?.id || "webhook-user";

    // Save signal to database
    const signal = await saveEngagementSignal(
      userid,
      lead_email,
      event_type,
      event_data,
      provider
    );

    if (!signal) {
      console.warn("[Webhook] Failed to save engagement signal to database");
      // Still continue to queue processing
    }

    // Queue signal for processing in the Python agent (engagement_adaptation)
    const jobResult = await submitSignalJob(userid, {
      userid,
      lead_email,
      event_type,
      event_data,
      provider,
    });

    return res.status(202).json({
      status: "received",
      message: "Engagement signal received and queued for processing",
      signal_id: signal?.id,
      job_id: jobResult.jobId,
    });
  } catch (error) {
    console.error("[Webhook] Error processing email webhook:", error);
    return res.status(500).json({
      error: "Failed to process webhook",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/webhooks/replay/:signal_id
 * Manually replay a signal through the engagement_adaptation agent
 * Useful for debugging or re-processing failed signals
 */
webhookRouter.post("/replay/:signal_id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { signal_id } = req.params;
    const { lead_email, event_type, event_data, provider } = req.body;

    if (!lead_email || !event_type || !event_data || !provider) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const userid = (req as any).user?.id;
    if (!userid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Queue the signal again
    const jobResult = await submitSignalJob(userid, {
      userid,
      lead_email,
      event_type,
      event_data,
      provider,
    });

    return res.json({
      status: "queued",
      message: "Signal re-queued for processing",
      job_id: jobResult.jobId,
    });
  } catch (error) {
    console.error("[Webhook] Error replaying signal:", error);
    return res.status(500).json({
      error: "Failed to replay signal",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default webhookRouter;
