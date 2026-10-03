-- Saved cards, Portugal. A signed-in client who pays a business online becomes a customer of that
-- business's own Stripe account, so Stripe's payment page can remember the card there (only when
-- the client ticks it) and offer it on the next booking. The card itself stays with Stripe; this
-- only remembers which Stripe customer is which Locappoint person, per business.
-- Written only by the checkout function (service role). Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_customers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe', 'paystack')),
  account_ref text NOT NULL CHECK (char_length(account_ref) BETWEEN 3 AND 100),
  customer_ref text NOT NULL CHECK (char_length(customer_ref) BETWEEN 3 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, business_id, provider)
);

CREATE INDEX IF NOT EXISTS payment_customers_business ON public.payment_customers (business_id);

ALTER TABLE public.payment_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_customers FROM anon, authenticated;

COMMIT;
 