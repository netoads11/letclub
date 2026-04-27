
-- Tighten notification insert policy: users can only insert their own
DROP POLICY IF EXISTS "System insert notif" ON public.notificacoes;
CREATE POLICY "Users insert own notif" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Revoke EXECUTE on internal trigger functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_checkin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_post_comunidade() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unlock_badge(UUID, TEXT) FROM PUBLIC, anon, authenticated;
-- has_role stays callable so RLS policies work for authenticated users
