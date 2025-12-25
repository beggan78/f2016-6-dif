-- Migration: Add dismiss functionality to connected_player table
-- Purpose: Allow users to permanently dismiss ghost players from external providers
-- Date: 2025-12-25

-- Add dismiss tracking columns to connected_player
ALTER TABLE public.connected_player
  ADD COLUMN is_dismissed boolean NOT NULL DEFAULT false,
  ADD COLUMN dismissed_at timestamptz,
  ADD COLUMN dismissed_by uuid REFERENCES auth.users(id);

-- Create index for efficient filtering of non-dismissed players
CREATE INDEX idx_connected_player_not_dismissed
  ON public.connected_player(connector_id, is_dismissed)
  WHERE is_dismissed = false;

-- Add comment for documentation
COMMENT ON COLUMN public.connected_player.is_dismissed IS
  'Flag indicating if user has dismissed this external player (will not appear as ghost)';
COMMENT ON COLUMN public.connected_player.dismissed_at IS
  'Timestamp when the player was dismissed';
COMMENT ON COLUMN public.connected_player.dismissed_by IS
  'User ID who dismissed the player (references auth.users for audit trail)';
