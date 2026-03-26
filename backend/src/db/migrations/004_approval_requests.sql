-- Migration 004: Create approval requests table for human approval gate
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  lead_email VARCHAR(255) NOT NULL,
  lead_name VARCHAR(255) NOT NULL,
  sequence_json JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  action VARCHAR(50),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_userid_status 
  ON approval_requests(userid, status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at 
  ON approval_requests(created_at DESC);
