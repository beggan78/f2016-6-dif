-- ============================================================================
-- PLAYER LOAN TRACKING - Sport Wizard
-- ============================================================================
-- Purpose: Track player loan appearances for external teams
-- Scope: Team-specific loan records
-- Security: RLS policies enforce team membership for read, admin/coach for write
-- ============================================================================

---------------------------------------------------------------------------
-- TABLE: player_loan
---------------------------------------------------------------------------

CREATE TABLE public.player_loan (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core relationships
  player_id uuid NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,

  -- Loan details
  receiving_team_name varchar(200) NOT NULL,
  loan_date date NOT NULL,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

---------------------------------------------------------------------------
-- INDEXES
---------------------------------------------------------------------------

CREATE INDEX idx_player_loan_player_id ON public.player_loan(player_id);
CREATE INDEX idx_player_loan_team_id ON public.player_loan(team_id);
CREATE INDEX idx_player_loan_date ON public.player_loan(loan_date DESC);

---------------------------------------------------------------------------
-- TRIGGERS
---------------------------------------------------------------------------

CREATE TRIGGER update_player_loan_timestamp
  BEFORE UPDATE ON public.player_loan
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
---------------------------------------------------------------------------

ALTER TABLE public.player_loan ENABLE ROW LEVEL SECURITY;

-- Team members can view loans
CREATE POLICY player_loan_select_policy ON public.player_loan
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player p
      JOIN public.team_user tu ON tu.team_id = p.team_id
      WHERE p.id = player_loan.player_id
        AND p.team_id = player_loan.team_id
        AND tu.user_id = auth.uid()
    )
  );

-- Team admins/coaches can insert loans
CREATE POLICY player_loan_insert_policy ON public.player_loan
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player p
      JOIN public.team_user tu ON tu.team_id = p.team_id
      WHERE p.id = player_loan.player_id
        AND p.team_id = player_loan.team_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'coach')
    )
  );

-- Team admins/coaches can update loans
CREATE POLICY player_loan_update_policy ON public.player_loan
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player p
      JOIN public.team_user tu ON tu.team_id = p.team_id
      WHERE p.id = player_loan.player_id
        AND p.team_id = player_loan.team_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'coach')
    )
  );

-- Team admins/coaches can delete loans
CREATE POLICY player_loan_delete_policy ON public.player_loan
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player p
      JOIN public.team_user tu ON tu.team_id = p.team_id
      WHERE p.id = player_loan.player_id
        AND p.team_id = player_loan.team_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'coach')
    )
  );

---------------------------------------------------------------------------
-- DOCUMENTATION
---------------------------------------------------------------------------

COMMENT ON TABLE public.player_loan IS 'Tracks player loan appearances for external teams';
COMMENT ON COLUMN public.player_loan.receiving_team_name IS 'Name of the team receiving the player loan';
COMMENT ON COLUMN public.player_loan.loan_date IS 'Date of the loan match (YYYY-MM-DD)';
