-- Migration 005: Create guardrail violations table
CREATE TABLE IF NOT EXISTS guardrail_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL,
  domain VARCHAR(255),
  emails_sent_today INT DEFAULT 0,
  daily_limit INT DEFAULT 0,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardrail_violations_userid_type 
  ON guardrail_violations(userid, violation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guardrail_violations_domain 
  ON guardrail_violations(domain, created_at DESC);
