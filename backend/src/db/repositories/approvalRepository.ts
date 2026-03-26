import { query, queryAll } from "../connection";

export interface ApprovalRequest {
  id: string;
  userid: string;
  lead_email: string;
  lead_name: string;
  sequence_json: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  action?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export async function createApprovalRequest(
  userid: string,
  lead_email: string,
  lead_name: string,
  sequence_json: Record<string, unknown>
): Promise<ApprovalRequest | null> {
  try {
    const result = await query<any>(
      `INSERT INTO approval_requests 
       (userid, lead_email, lead_name, sequence_json) 
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userid, lead_email, lead_name, JSON.stringify(sequence_json)]
    );
    const row = result.rows[0] as any;
    if (row) {
      row.sequence_json = JSON.parse(row.sequence_json);
    }
    return row || null;
  } catch (error) {
    console.error("[ApprovalRepository] Error creating request:", error);
    return null;
  }
}

export async function getPendingApprovals(userid: string): Promise<ApprovalRequest[]> {
  try {
    const rows = await queryAll<any>(
      `SELECT * FROM approval_requests 
       WHERE userid = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [userid]
    );
    return (rows || []).map((row: any) => ({
      ...row,
      sequence_json: JSON.parse(row.sequence_json),
    }));
  } catch (error) {
    console.error("[ApprovalRepository] Error fetching pending approvals:", error);
    return [];
  }
}

export async function approveRequest(
  requestId: string,
  approvedBy: string,
  action: string = "approved"
): Promise<ApprovalRequest | null> {
  try {
    const result = await query<any>(
      `UPDATE approval_requests 
       SET status = 'approved', action = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId, action, approvedBy]
    );
    const row = result.rows[0] as any;
    if (row) {
      row.sequence_json = JSON.parse(row.sequence_json);
    }
    return row || null;
  } catch (error) {
    console.error("[ApprovalRepository] Error approving request:", error);
    return null;
  }
}

export async function rejectRequest(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<ApprovalRequest | null> {
  try {
    const result = await query<any>(
      `UPDATE approval_requests 
       SET status = 'rejected', action = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId, reason, rejectedBy]
    );
    const row = result.rows[0] as any;
    if (row) {
      row.sequence_json = JSON.parse(row.sequence_json);
    }
    return row || null;
  } catch (error) {
    console.error("[ApprovalRepository] Error rejecting request:", error);
    return null;
  }
}

export async function getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
  try {
    const result = await query<any>(
      `SELECT * FROM approval_requests WHERE id = $1`,
      [requestId]
    );
    const row = result.rows[0] as any;
    if (row) {
      row.sequence_json = JSON.parse(row.sequence_json);
    }
    return row || null;
  } catch (error) {
    console.error("[ApprovalRepository] Error fetching approval request:", error);
    return null;
  }
}
