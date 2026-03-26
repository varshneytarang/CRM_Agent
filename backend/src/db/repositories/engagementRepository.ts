import { query, queryAll } from "../connection";

export interface EngagementSignal {
  id: string;
  userid: string;
  lead_email: string;
  event_type: string;
  event_data: Record<string, unknown>;
  provider: string;
  timestamp: string;
  created_at: string;
}

export async function saveEngagementSignal(
  userid: string,
  lead_email: string,
  event_type: string,
  event_data: Record<string, unknown>,
  provider: string
): Promise<EngagementSignal | null> {
  try {
    const result = await query<EngagementSignal>(
      `INSERT INTO engagement_signals 
       (userid, lead_email, event_type, event_data, provider, timestamp) 
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userid, lead_email, event_type, JSON.stringify(event_data), provider]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("[EngagementSignalRepository] Error saving signal:", error);
    return null;
  }
}

export async function getEngagementSignalsForLead(
  userid: string,
  lead_email: string,
  limit: number = 50
): Promise<EngagementSignal[]> {
  try {
    return await queryAll<EngagementSignal>(
      `SELECT * FROM engagement_signals 
       WHERE userid = $1 AND lead_email = $2 
       ORDER BY timestamp DESC 
       LIMIT $3`,
      [userid, lead_email, limit]
    );
  } catch (error) {
    console.error("[EngagementSignalRepository] Error fetching signals:", error);
    return [];
  }
}

export async function getEngagementSignalsByType(
  userid: string,
  event_type: string,
  hours: number = 24
): Promise<EngagementSignal[]> {
  try {
    return await queryAll<EngagementSignal>(
      `SELECT * FROM engagement_signals 
       WHERE userid = $1 AND event_type = $2 
       AND timestamp > NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp DESC`,
      [userid, event_type]
    );
  } catch (error) {
    console.error("[EngagementSignalRepository] Error fetching signals by type:", error);
    return [];
  }
}

export async function getRecentEngagementSignals(
  userid: string,
  limit: number = 50
): Promise<EngagementSignal[]> {
  try {
    return await queryAll<EngagementSignal>(
      `SELECT * FROM engagement_signals
       WHERE userid = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [userid, limit]
    );
  } catch (error) {
    console.error("[EngagementSignalRepository] Error fetching recent signals:", error);
    return [];
  }
}
