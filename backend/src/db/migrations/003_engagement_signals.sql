-- Migration 003: Create engagement signals table for webhook events
CREATE TABLE IF NOT EXISTS engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  lead_email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  provider VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_signals_userid_timestamp 
  ON engagement_signals(userid, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_signals_lead_email 
  ON engagement_signals(lead_email);
