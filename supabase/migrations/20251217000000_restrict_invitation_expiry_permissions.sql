-- Restrict expire_old_team_invitations() execution to service_role (cron)
-- Removes previous grants to authenticated/public to prevent manual execution

REVOKE EXECUTE ON FUNCTION public.expire_old_team_invitations() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_team_invitations() FROM PUBLIC;

-- No GRANT needed; service_role retains access by default
