-- Run after guest-booking.sql. Every row should say ok.

SELECT 'guests can book' AS check,
       CASE WHEN has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid)', 'EXECUTE') THEN 'ok' ELSE 'missing' END AS result
UNION ALL
SELECT 'manage links are private',
       CASE WHEN NOT has_table_privilege('anon', 'public.booking_links', 'SELECT')
             AND NOT has_table_privilege('authenticated', 'public.booking_links', 'SELECT') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'every open booking has a link',
       CASE WHEN NOT EXISTS (SELECT 1 FROM public.appointments a
                              WHERE a.status IN ('pending', 'confirmed')
                                AND NOT EXISTS (SELECT 1 FROM public.booking_links l WHERE l.appointment_id = a.id)) THEN 'ok' ELSE 'missing links' END
UNION ALL
SELECT 'see, move and cancel by link',
       CASE WHEN has_function_privilege('anon', 'public.booking_by_link(text)', 'EXECUTE')
             AND has_function_privilege('anon', 'public.cancel_by_link(text)', 'EXECUTE')
             AND has_function_privilege('anon', 'public.reschedule_by_link(text, date, time)', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'guest bookings join the account on confirm',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'claim_on_confirm')
             AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'claim_on_profile') THEN 'ok' ELSE 'missing' END;
