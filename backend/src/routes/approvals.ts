import express, { Router, Request, Response } from "express";
import { requireAuth } from "./auth";
import {
  createApprovalRequest,
  getPendingApprovals,
  approveRequest,
  rejectRequest,
  getApprovalRequest,
} from "../db/repositories/approvalRepository";

const approvalRouter = Router();

interface AuthenticatedRequest extends Request {
  user?: { userid?: string; id?: string };
}

/**
 * GET /api/approvals/pending
 * Get all pending approval requests for the authenticated user
 */
approvalRouter.get(
  "/pending",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userid = req.user?.userid ?? req.user?.id;
      if (!userid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const approvals = await getPendingApprovals(userid);

      return res.json({
        status: "success",
        count: approvals.length,
        approvals,
      });
    } catch (error) {
      console.error("[Approval] Error fetching pending approvals:", error);
      return res.status(500).json({
        error: "Failed to fetch approvals",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/approvals/:request_id
 * Get a specific approval request
 */
approvalRouter.get(
  "/:request_id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request_id = String(req.params.request_id);
      const userid = req.user?.userid ?? req.user?.id;
      if (!userid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const approval = await getApprovalRequest(request_id);
      if (!approval) {
        return res.status(404).json({ error: "Approval request not found" });
      }

      // Verify ownership
      if (approval.userid !== userid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.json(approval);
    } catch (error) {
      console.error("[Approval] Error fetching approval request:", error);
      return res.status(500).json({
        error: "Failed to fetch approval",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/approvals/:request_id/approve
 * Approve an outbound sequence
 */
approvalRouter.post(
  "/:request_id/approve",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request_id = String(req.params.request_id);
      const userid = req.user?.userid ?? req.user?.id;
      if (!userid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify this request belongs to the user
      const existingRequest = await getApprovalRequest(request_id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Approval request not found" });
      }

      if (existingRequest.userid !== userid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { comment } = req.body;

      // Approve the request
      const updated = await approveRequest(
        request_id,
        userid,
        comment || "approved"
      );

      if (!updated) {
        return res
          .status(500)
          .json({ error: "Failed to update approval request" });
      }

      return res.json({
        status: "approved",
        message: "Outbound sequence approved. Emails will be sent.",
        approval: updated,
      });
    } catch (error) {
      console.error("[Approval] Error approving request:", error);
      return res.status(500).json({
        error: "Failed to approve request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/approvals/:request_id/reject
 * Reject an outbound sequence
 */
approvalRouter.post(
  "/:request_id/reject",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request_id = String(req.params.request_id);
      const userid = req.user?.userid ?? req.user?.id;
      if (!userid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify this request belongs to the user
      const existingRequest = await getApprovalRequest(request_id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Approval request not found" });
      }

      if (existingRequest.userid !== userid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "reason field is required" });
      }

      // Reject the request
      const updated = await rejectRequest(request_id, userid, reason);

      if (!updated) {
        return res
          .status(500)
          .json({ error: "Failed to update approval request" });
      }

      return res.json({
        status: "rejected",
        message: "Sequence rejected. No emails will be sent.",
        approval: updated,
      });
    } catch (error) {
      console.error("[Approval] Error rejecting request:", error);
      return res.status(500).json({
        error: "Failed to reject request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/approvals
 * Create a new approval request (called from Python agent when human approval is required)
 */
approvalRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { userid, lead_email, lead_name, sequence_json, api_key } = req.body;

    if (!userid || !lead_email || !lead_name || !sequence_json || !api_key) {
      return res.status(400).json({
        error:
          "Missing required fields: userid, lead_email, lead_name, sequence_json, api_key",
      });
    }

    // TODO: Validate api_key matches userid

    const approval = await createApprovalRequest(
      userid,
      lead_email,
      lead_name,
      sequence_json
    );

    if (!approval) {
      return res.status(500).json({ error: "Failed to create approval request" });
    }

    return res.status(201).json({
      status: "created",
      message: "Approval request created. Awaiting human decision.",
      approval,
    });
  } catch (error) {
    console.error("[Approval] Error creating approval request:", error);
    return res.status(500).json({
      error: "Failed to create approval request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default approvalRouter;
