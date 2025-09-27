-- Add soft delete support for match records

ALTER TABLE public.match
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.match.deleted_at IS 'Timestamp when the match was soft deleted.';

-- Index deleted_at to speed up filters that exclude soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_match_deleted_at ON public.match(deleted_at);

-- Keep common state lookups fast for non-deleted records
CREATE INDEX IF NOT EXISTS idx_match_state_not_deleted ON public.match(state) WHERE deleted_at IS NULL;
