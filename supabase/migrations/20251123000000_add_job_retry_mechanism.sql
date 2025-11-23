-- Add retry mechanism for connector sync jobs
-- This migration adds support for automatic retries of failed jobs

-- Step 1: Add 'retrying' status to the enum
ALTER TYPE sync_job_status ADD VALUE IF NOT EXISTS 'retrying';

-- Step 2: Add failure_count column to track consecutive failures
ALTER TABLE connector_sync_job
ADD COLUMN failure_count integer NOT NULL DEFAULT 0;

-- Step 3: Add comment to document the retry logic
COMMENT ON COLUMN connector_sync_job.failure_count IS 'Number of consecutive failures. Reset to 0 on success. Jobs with failure_count < 5 and status=retrying will be retried automatically.';
