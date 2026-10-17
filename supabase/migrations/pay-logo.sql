-- pay1: the page a client lands on after paying shows the business's own logo, like every other
-- ticket. payment_state as in pay-at-booking.sql, plus country and logo_url. Safe to run again.

CREATE OR REPLACE FUNCTION public.payment_state(p_checkout_ref text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'state', CASE
      WHEN p.status = 'open' AND a.payment_status = 'awaiting' THEN 'waiting'
      WHEN p.status = 'paid' AND a.payment_status = 'paid' THEN 'paid'
      WHEN p.status IN ('paid', 'refunded', 'partly_refunded') AND a.id IS NULL THEN 'refunding'
      WHEN p.status = 'paid' THEN 'paid'
      ELSE 'released' END,
    'status', a.status,
    'business_name', b.business_name,
    'slug', b.slug,
    'address', b.address,
    'city', b.city,
    'country', b.country,
    'logo_url', b.logo_url,
    'timezone', b.timezone,
    'auto_confirm', b.auto_confirm,
    'service_name', concat_ws(' + ', s.service_name, (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(coalesce(a.addons, '[]')) x)),
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'client_fee', a.client_fee,
    'amount', p.amount,
    'currency', p.currency,
    'provider', p.provider,
    'email', CASE WHEN p.status = 'paid' THEN a.client_email END,
    'manage_token', CASE WHEN p.status = 'paid' AND a.payment_status = 'paid'
                         THEN (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id) END
  )
    FROM public.payments p
    JOIN public.businesses b ON b.id = p.business_id
    LEFT JOIN public.appointments a ON a.id = p.appointment_id
    LEFT JOIN public.services s ON s.id = a.service_id
   WHERE length(p_checkout_ref) >= 20
     AND (p.checkout_ref = p_checkout_ref OR p.appointment_id::text = p_checkout_ref)
   ORDER BY p.created_at DESC
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_state(text) TO anon, authenticated, service_role;
