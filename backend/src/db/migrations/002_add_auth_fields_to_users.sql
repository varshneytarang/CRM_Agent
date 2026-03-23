-- ============================================================================
-- 002_ADD_AUTH_FIELDS_TO_USERS.sql
-- Add authentication and onboarding fields to users table
-- PostgreSQL 13+
-- ============================================================================

-- Add password hash column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add onboarding status column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add CRM connection indicator
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_connected_crm BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_has_connected_crm ON users(has_connected_crm);

-- ============================================================================
-- DONE
-- ============================================================================
