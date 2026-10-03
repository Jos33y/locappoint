BEGIN;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('bookings', 'business_page', 'billing', 'account', 'other')),
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 140),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status, created_at DESC);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_own_insert ON public.support_tickets;
CREATE POLICY tickets_own_insert ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'open'
    AND (business_id IS NULL OR public.is_business_member(business_id))
  );

DROP POLICY IF EXISTS tickets_own_read ON public.support_tickets;
CREATE POLICY tickets_own_read ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS tickets_admin_update ON public.support_tickets;
CREATE POLICY tickets_admin_update ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.support_tickets FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
