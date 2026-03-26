import { query, queryAll } from "../db/connection";

type SnapshotRecord = {
  id: string;
  userid: string;
  action: string;
  payload: unknown;
  createdAt: string;
};

const snapshotsByUser = new Map<string, SnapshotRecord[]>();
let schemaReady = false;

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function fallbackToMemory(): boolean {
  return process.env.PROSPECTING_SNAPSHOT_FALLBACK_MEMORY !== "false";
}

async function ensureSchema(): Promise<void> {
  if (schemaReady || !useDb()) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS prospecting_run_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      userid TEXT NOT NULL,
      action TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_prospecting_run_snapshots_user_created
    ON prospecting_run_snapshots (userid, created_at DESC)
  `);

  schemaReady = true;
}

function saveToMemory(record: SnapshotRecord): SnapshotRecord {
  const existing = snapshotsByUser.get(record.userid) ?? [];
  existing.unshift(record);
  snapshotsByUser.set(record.userid, existing.slice(0, 25));
  return record;
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveProspectingSnapshot(
  userid: string,
  action: string,
  payload: unknown
): Promise<SnapshotRecord> {
  const record: SnapshotRecord = {
    id: generateRunId(),
    userid: String(userid ?? "").trim(),
    action: String(action ?? "").trim(),
    payload,
    createdAt: new Date().toISOString(),
  };

  if (!record.userid || !record.action) {
    return saveToMemory(record);
  }

  if (useDb()) {
    try {
      await ensureSchema();
      const inserted = await query<{ id: string }>(
        `INSERT INTO prospecting_run_snapshots (userid, action, payload, created_at)
         VALUES ($1, $2, $3::jsonb, $4::timestamptz)
         RETURNING id`,
        [record.userid, record.action, JSON.stringify(record.payload ?? {}), record.createdAt]
      );
      const dbId = inserted.rows[0]?.id;
      if (dbId) {
        record.id = dbId;
      }
      return record;
    } catch (err) {
      if (!fallbackToMemory()) {
        throw err;
      }
    }
  }

  return saveToMemory(record);
}

export async function getProspectingSnapshots(userid: string): Promise<SnapshotRecord[]> {
  const normalizedUserId = String(userid ?? "").trim();
  if (!normalizedUserId) {
    return [];
  }

  if (useDb()) {
    try {
      await ensureSchema();
      const rows = await queryAll<{
        id: string;
        userid: string;
        action: string;
        payload: unknown;
        created_at: string;
      }>(
        `SELECT id, userid, action, payload, created_at
         FROM prospecting_run_snapshots
         WHERE userid = $1
         ORDER BY created_at DESC
         LIMIT 25`,
        [normalizedUserId]
      );

      return rows.map((row) => ({
        id: row.id,
        userid: row.userid,
        action: row.action,
        payload: row.payload,
        createdAt: row.created_at,
      }));
    } catch (err) {
      if (!fallbackToMemory()) {
        throw err;
      }
    }
  }

  return snapshotsByUser.get(normalizedUserId) ?? [];
}

export async function getProspectingSnapshotById(
  userid: string,
  runId: string
): Promise<SnapshotRecord | null> {
  const normalizedUserId = String(userid ?? "").trim();
  const normalizedRunId = String(runId ?? "").trim();

  if (!normalizedUserId || !normalizedRunId) {
    return null;
  }

  if (useDb()) {
    try {
      await ensureSchema();
      const rows = await queryAll<{
        id: string;
        userid: string;
        action: string;
        payload: unknown;
        created_at: string;
      }>(
        `SELECT id, userid, action, payload, created_at
         FROM prospecting_run_snapshots
         WHERE userid = $1 AND id = $2
         LIMIT 1`,
        [normalizedUserId, normalizedRunId]
      );

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        userid: row.userid,
        action: row.action,
        payload: row.payload,
        createdAt: row.created_at,
      };
    } catch (err) {
      if (!fallbackToMemory()) {
        throw err;
      }
    }
  }

  const snapshots = snapshotsByUser.get(normalizedUserId) ?? [];
  return snapshots.find((item) => item.id === normalizedRunId) ?? null;
}
