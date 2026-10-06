-- Engine v1: "What do you need?". One request (what, where, when, how many) is matched against every
-- live business in the city by rules, not AI: the service fits the words, the business offers that
-- format, covers the client's area or distance, takes a group that size, and is free in the window.
-- Ranked by time first (what the client asked for), then distance, then quality as a floor and
-- tie-breaker; a business the client already booked comes first. Up to three options, each with a
-- different reason (best match, earliest, closest or top rated). Every channel (site, app, WhatsApp,
-- assistants) calls engine_match. Decisions and how to retune: claude/18-decision-log.md.
-- Needs formats-groups.sql. Safe to run again.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- 1. Words: accents and case folded, so "Unhas de gel" and "unhas de gel" are the same.
CREATE OR REPLACE FUNCTION public.engine_fold(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT btrim(regexp_replace(
    translate(lower(coalesce(p, '')), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

-- What each category is called, in English and Portuguese (from constants/categories.js).
CREATE TABLE IF NOT EXISTS public.engine_categories (
  key text PRIMARY KEY,
  words text NOT NULL
);

INSERT INTO public.engine_categories (key, words) VALUES
  ('barbershop', 'barbershop barbearia barbeiro barber'),
  ('hair_salon', 'hair salon cabeleireiro salao cabelo'),
  ('braids', 'braids and natural hair trancas trancas afro natural'),
  ('nails', 'nails unhas manicure pedicure'),
  ('lashes_brows', 'lashes and brows pestanas sobrancelhas'),
  ('skincare', 'skincare and facials estetica limpeza de pele facial'),
  ('hair_removal', 'waxing and laser hair removal depilacao depilacao laser cera'),
  ('makeup', 'make up artist maquilhagem maquiagem'),
  ('tanning', 'tanning bronze bronzeamento'),
  ('beauty_salon', 'beauty salon estetica estetica beleza instituto'),
  ('tattoo', 'tattoo and piercing tatuagem piercing'),
  ('massage', 'massage massagem'),
  ('spa', 'spa spa bem estar'),
  ('aesthetic_clinic', 'aesthetic clinic clinica estetica medicina estetica botox'),
  ('physio', 'physiotherapy fisioterapia fisioterapeuta'),
  ('osteopathy', 'osteopathy osteopatia osteopata'),
  ('chiropractor', 'chiropractor quiropraxia quiropratico'),
  ('acupuncture', 'acupuncture acupunctura acupuntura'),
  ('nutritionist', 'nutritionist nutricionista nutricao dieta'),
  ('therapist', 'psychologist or therapist psicologo psicologa terapeuta terapia'),
  ('speech_therapy', 'speech therapy terapia da fala terapeuta da fala'),
  ('podiatry', 'podiatry podologia podologo'),
  ('dentist', 'dentist dentista clinica dentaria dentaria'),
  ('medical_clinic', 'medical clinic clinica medica medico consulta'),
  ('personal_trainer', 'personal trainer personal trainer treinador'),
  ('gym', 'gym or studio ginasio ginasio estudio'),
  ('yoga', 'yoga yoga ioga'),
  ('pilates', 'pilates pilates'),
  ('martial_arts', 'martial arts artes marciais jiu jitsu boxe karate'),
  ('dance', 'dance classes danca danca'),
  ('swimming', 'swimming lessons natacao natacao piscina'),
  ('pet_grooming', 'pet grooming tosquia banho animais caes caes'),
  ('vet', 'vet veterinario veterinario'),
  ('dog_training', 'dog training and walking treino de caes passeio'),
  ('tutoring', 'tutoring and exam prep explicacoes explicacoes explicador exames'),
  ('language_school', 'language school escola de linguas linguas portugues ingles'),
  ('music_lessons', 'music lessons aulas de musica musica guitarra piano'),
  ('art_classes', 'art and craft classes aulas de arte ceramica ceramica workshop'),
  ('driving_school', 'driving school escola de conducao conducao carta'),
  ('cleaning', 'cleaning limpeza limpezas'),
  ('electrician', 'electrician eletricista electricista'),
  ('plumber', 'plumber canalizador picheleiro'),
  ('handyman', 'handyman faz tudo reparacoes reparacoes'),
  ('appliance_repair', 'appliance repair reparacao eletrodomesticos'),
  ('gardening', 'gardening jardinagem jardineiro'),
  ('car_wash', 'car wash and detailing lavagem auto detalhe'),
  ('mechanic', 'mechanic mecanico mecanico oficina revisao'),
  ('tyres', 'tyres pneus'),
  ('bike_repair', 'bike repair bicicletas reparacao'),
  ('web_studio', 'web and software studio website software apps desenvolvimento web'),
  ('design_studio', 'design studio design grafico branding'),
  ('marketing_agency', 'marketing agency marketing redes sociais'),
  ('photographer', 'photographer fotografo fotografo fotografia'),
  ('videographer', 'videographer video videografo'),
  ('consultant', 'consultant consultor consultoria'),
  ('coach', 'coach coaching mentor'),
  ('accountant', 'accountant contabilista contabilidade'),
  ('lawyer', 'lawyer advogado advocacia'),
  ('notary', 'notary notario notario'),
  ('real_estate', 'real estate agent imobiliaria imobiliaria casa'),
  ('financial_adviser', 'financial adviser consultor financeiro investimentos'),
  ('tech_repair', 'phone and computer repair reparacao telemoveis telemoveis computadores'),
  ('tailor', 'tailor and alterations costureira arranjos alfaiate'),
  ('shoe_repair', 'shoe repair sapateiro sapatos'),
  ('event_planner', 'event planner eventos organizacao casamentos'),
  ('venue', 'venue hire espaco aluguer sala'),
  ('coworking', 'meeting rooms and coworking cowork sala de reunioes escritorio')
ON CONFLICT (key) DO UPDATE SET words = EXCLUDED.words;

-- Words that mean the same thing for matching, in both languages. Same group, same meaning.
CREATE TABLE IF NOT EXISTS public.engine_words (
  word text PRIMARY KEY,
  grp integer NOT NULL
);

INSERT INTO public.engine_words (word, grp)
SELECT w, g FROM (VALUES
  (1, 'haircut corte cortar cut cabelo hair fade'),
  (2, 'beard barba barbear shave'),
  (3, 'nails nail unhas unha manicure pedicure gel verniz'),
  (4, 'brows brow sobrancelhas sobrancelha'),
  (5, 'lashes lash pestanas pestana'),
  (6, 'massage massagem massagens'),
  (7, 'cleaning clean cleaner limpeza limpezas limpar'),
  (8, 'lesson lessons class classes aula aulas tutor tutoring explicacao explicacoes explicador'),
  (9, 'makeup maquilhagem maquiagem'),
  (10, 'braids braid trancas tranca cornrows twists'),
  (11, 'waxing wax depilacao cera laser'),
  (12, 'facial facials pele skincare estetica'),
  (13, 'training trainer treino treinador personal workout'),
  (14, 'physio physiotherapy fisioterapia fisio'),
  (15, 'dentist dentista dental dentes'),
  (16, 'coach coaching mentor mentoring'),
  (17, 'photo photos photographer fotografo fotografia'),
  (18, 'repair repairs reparacao reparacoes arranjo arranjos fix'),
  (19, 'gele headtie')
) AS t(g, list)
CROSS JOIN LATERAL unnest(string_to_array(list, ' ')) AS w
ON CONFLICT (word) DO UPDATE SET grp = EXCLUDED.grp;

ALTER TABLE public.engine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_words ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engine_categories FROM anon, authenticated;
REVOKE ALL ON public.engine_words FROM anon, authenticated;

-- 2. How well a service fits the words: 3 for a word in its name, 2 for its business's category,
-- 1 for a near spelling (one letter off in short words, two in words of five letters or more, so
-- "nials" still finds nails). Summed over the client's words, each word counted once at its best.
CREATE OR REPLACE FUNCTION public.engine_fit(p_tokens text[], p_name text, p_category text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH alts AS (
    SELECT t.tok, t.tok AS alt FROM unnest(p_tokens) AS t(tok)
    UNION
    SELECT t.tok, w2.word FROM unnest(p_tokens) AS t(tok)
      JOIN public.engine_words w1 ON w1.word = t.tok
      JOIN public.engine_words w2 ON w2.grp = w1.grp
  ),
  hay AS (
    SELECT ' ' || public.engine_fold(p_name) || ' ' AS name,
           ' ' || coalesce((SELECT c.words FROM public.engine_categories c WHERE c.key = p_category), '') || ' ' AS cat
  ),
  best AS (
    SELECT a.tok, max(CASE
      WHEN position(' ' || a.alt IN h.name) > 0 THEN 3
      WHEN position(' ' || a.alt IN h.cat) > 0 THEN 2
      WHEN length(a.alt) >= 4 AND (
             extensions.word_similarity(a.alt, h.name || h.cat) >= 0.6
             OR EXISTS (SELECT 1 FROM unnest(string_to_array(btrim(h.name || h.cat), ' ')) AS w
                         WHERE length(w) >= 4 AND abs(length(w) - length(a.alt)) <= 2
                           AND extensions.levenshtein(a.alt, w) <= CASE WHEN length(a.alt) >= 5 THEN 2 ELSE 1 END)) THEN 1
      ELSE 0 END) AS score
      FROM alts a CROSS JOIN hay h
     GROUP BY a.tok
  )
  SELECT coalesce(sum(score), 0) FROM best;
$$;

-- 3. The match.
--   p_market   porto, lisbon or lagos
--   p_query    what the client typed ("unhas de gel", "haircut for my son")
--   p_mode     at_business, at_client, online, or null for any
--   p_dates    up to three days, in the city's own calendar
--   p_window   any, morning (before 12), afternoon (12 to 17), evening (after 17)
--   p_at       around this time (90 minutes either side), instead of the window
--   p_people   how many people
--   p_lat, p_lng, p_zone   where the client is (the address picked, or the area)
CREATE OR REPLACE FUNCTION public.engine_match(
  p_market text, p_query text, p_mode text DEFAULT NULL, p_dates date[] DEFAULT NULL,
  p_window text DEFAULT 'any', p_at time without time zone DEFAULT NULL, p_people integer DEFAULT 1,
  p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_zone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_now timestamp;
  v_dates date[];
  v_people integer := greatest(1, least(coalesce(p_people, 1), 50));
  v_tokens text[];
  v_from time;
  v_to time;
  v_matched integer;
  v_rows jsonb;
  v_later jsonb;
  v_pick jsonb := '[]'::jsonb;
  v_used uuid[] := '{}';
  r jsonb;
  v_first jsonb;
BEGIN
  SELECT m.timezone INTO v_tz FROM public.markets m WHERE m.code = p_market;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Pick a city' USING ERRCODE = '22023';
  END IF;
  IF p_mode IS NOT NULL AND p_mode NOT IN ('at_business', 'at_client', 'online') THEN
    RAISE EXCEPTION 'Pick where it happens' USING ERRCODE = '22023';
  END IF;
  IF p_mode = 'at_client' AND p_zone IS NULL AND p_lat IS NULL THEN
    RAISE EXCEPTION 'Tell us where you are, so we only show people who come to you' USING ERRCODE = '22023';
  END IF;

  -- A brake on repeated searches: per visitor when signed out, per person when signed in.
  IF v_uid IS NULL THEN
    IF NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'engine:ip:' || public.request_origin() END, 60, 600) THEN
      RAISE EXCEPTION 'Lots of searches from here. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NOT public.rate_ok('engine:user:' || v_uid, 120, 600) THEN
    RAISE EXCEPTION 'Lots of searches. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
  END IF;

  v_now := now() AT TIME ZONE v_tz;
  v_today := v_now::date;
  SELECT coalesce(array_agg(d ORDER BY d), ARRAY[v_today])
    INTO v_dates
    FROM (SELECT DISTINCT d FROM unnest(coalesce(p_dates, ARRAY[v_today])) AS d
           WHERE d BETWEEN v_today AND v_today + 90 ORDER BY d LIMIT 3) x;
  IF cardinality(v_dates) = 0 THEN v_dates := ARRAY[v_today]; END IF;

  SELECT array_agg(DISTINCT tok) INTO v_tokens
    FROM unnest(string_to_array(public.engine_fold(p_query), ' ')) AS tok
   WHERE length(tok) >= 3
     AND tok <> ALL (ARRAY['and', 'the', 'for', 'with', 'please', 'book', 'need', 'want', 'some', 'someone', 'today', 'tomorrow',
                           'para', 'com', 'uma', 'uns', 'umas', 'por', 'favor', 'quero', 'preciso', 'marcar', 'hoje', 'amanha', 'meu', 'minha']);
  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Say what you need, like "haircut" or "nails"' USING ERRCODE = '22023';
  END IF;

  IF p_at IS NOT NULL THEN
    v_from := (p_at - interval '90 minutes')::time;
    v_to := (p_at + interval '90 minutes')::time;
    IF p_at < time '01:30' THEN v_from := time '00:00'; END IF;
    IF p_at > time '22:29' THEN v_to := time '23:59'; END IF;
  ELSE
    v_from := CASE p_window WHEN 'afternoon' THEN time '12:00' WHEN 'evening' THEN time '17:00' ELSE time '00:00' END;
    v_to := CASE p_window WHEN 'morning' THEN time '11:59' WHEN 'afternoon' THEN time '16:59' ELSE time '23:59' END;
  END IF;

  IF to_regclass('pg_temp.engine_slots') IS NULL THEN
    CREATE TEMP TABLE engine_slots (
      sid uuid, bid uuid, fit numeric, km numeric, day date, at time, in_window boolean
    ) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_slots;

  -- Services that fit the words, the format, the place and the group.
  WITH svc AS (
    SELECT s.id AS sid, b.id AS bid, public.engine_fit(v_tokens, s.service_name, b.category) AS fit,
           CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL THEN public.km_between(b.lat, b.lng, p_lat, p_lng) END AS km,
           b.is_demo
      FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE b.is_active = true AND b.market = p_market AND s.is_active = true
       AND v_people <= s.max_people
       AND (p_mode IS NULL OR p_mode = ANY (s.modes))
       AND (p_mode IS DISTINCT FROM 'at_client' OR (
             (p_zone IS NOT NULL AND p_zone = ANY (b.service_zones))
             OR (b.service_radius_km IS NOT NULL AND b.lat IS NOT NULL AND p_lat IS NOT NULL
                 AND public.km_between(b.lat, b.lng, p_lat, p_lng) <= b.service_radius_km)))
  ),
  fit AS (
    SELECT * FROM svc WHERE fit > 0 ORDER BY fit DESC, is_demo NULLS FIRST LIMIT 25
  )
  INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
  SELECT f.sid, f.bid, f.fit, f.km, d.day, sl.slot_time,
         sl.slot_time BETWEEN v_from AND v_to
    FROM fit f
   CROSS JOIN unnest(v_dates) AS d(day)
   CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, d.day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END) sl;

  SELECT count(DISTINCT sid) INTO v_matched FROM pg_temp.engine_slots;

  -- One option per business: its best service and time, scored.
  WITH stats AS (
    SELECT b.id AS bid, b.business_name, b.slug, b.city, b.logo_url, b.is_demo, b.currency,
           (SELECT round(avg(rv.rating)::numeric, 1) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS rating,
           (SELECT count(*) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS reviews,
           (SELECT CASE WHEN count(*) >= 5 THEN round(100.0 * count(*) FILTER (WHERE x.visits >= 2) / count(*)) END
              FROM (SELECT count(*) AS visits FROM public.appointments a
                     WHERE a.business_id = b.id AND a.status = 'completed' AND a.client_email IS NOT NULL
                       AND a.appointment_date > v_today - 365
                     GROUP BY lower(a.client_email)) x) AS rebook_pct,
           (SELECT CASE WHEN count(*) >= 5 THEN count(*) FILTER (WHERE a.status = 'cancelled' AND a.cancelled_by = 'business')::numeric / count(*) END
              FROM public.appointments a
             WHERE a.business_id = b.id AND a.status IN ('confirmed', 'completed', 'cancelled', 'no_show')
               AND a.appointment_date > v_today - 90) AS cancel_rate,
           (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.business_id = b.id AND a.client_id = v_uid AND a.status = 'completed')) AS regular
      FROM public.businesses b
     WHERE b.id IN (SELECT DISTINCT bid FROM pg_temp.engine_slots)
  ),
  scored AS (
    SELECT e.sid, e.bid, e.fit, e.km, e.day, e.at, st.business_name, st.slug, st.city, st.logo_url, st.is_demo, st.currency,
           st.rating, st.reviews, st.rebook_pct, st.cancel_rate, st.regular, s.service_name, s.price, s.price_per, s.modes, s.duration_minutes, s.extra_person_minutes,
           0.5 * CASE WHEN p_at IS NOT NULL
                   THEN 1 - least(abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at)) / 60) / 90, 1)
                   ELSE 1 - least(greatest(extract(epoch FROM (e.day + e.at) - v_now) / 60, 0) / (72 * 60), 1) END
         + 0.2 * CASE WHEN e.km IS NOT NULL THEN 1 - least(e.km / 15, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.reviews >= 5 THEN greatest(0, least(1, (st.rating - 3) / 2)) ELSE 0.5 END
         + 0.1 * CASE WHEN st.rebook_pct IS NOT NULL THEN least(st.rebook_pct / 100, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.cancel_rate IS NOT NULL THEN 1 - least(st.cancel_rate * 5, 1) ELSE 0.8 END
         + 0.02 * least(e.fit, 6) / 6
         + CASE WHEN st.regular THEN 0.25 ELSE 0 END
         - CASE WHEN st.is_demo THEN 1 ELSE 0 END
         + random() * 0.01 AS score
      FROM pg_temp.engine_slots e
      JOIN stats st ON st.bid = e.bid
      JOIN public.services s ON s.id = e.sid
     WHERE e.in_window
  ),
  best AS (
    SELECT DISTINCT ON (bid) * FROM scored ORDER BY bid, score DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'business_id', bid, 'business_name', business_name, 'slug', slug, 'city', city, 'logo_url', logo_url,
           'service_id', sid, 'service_name', service_name, 'people', v_people,
           'price', CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 'price_per', price_per, 'currency', currency,
           'minutes', duration_minutes + (v_people - 1) * coalesce(extra_person_minutes, duration_minutes),
           'mode', coalesce(p_mode, modes[1]),
           'date', day, 'time', to_char(at, 'HH24:MI'), 'starts', (day + at),
           'km', round(km, 1), 'rating', CASE WHEN reviews > 0 THEN rating END, 'reviews', reviews,
           'rebook_pct', rebook_pct, 'regular', regular, 'score', round(score::numeric, 4)
         ) ORDER BY score DESC), '[]'::jsonb)
    INTO v_rows
    FROM best;

  -- Three options, three different reasons.
  IF jsonb_array_length(v_rows) > 0 THEN
    v_first := v_rows->0;
    v_pick := jsonb_build_array(v_first || jsonb_build_object('label', CASE WHEN (v_first->>'regular')::boolean THEN 'regular' ELSE 'best' END));
    v_used := ARRAY[(v_first->>'business_id')::uuid];

    -- Earliest, when earlier than the best match.
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'starts') < (v_first->>'starts')
     ORDER BY x->>'starts', (x->>'score')::numeric DESC LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "earliest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END IF;

    -- Closest, when distance is known; otherwise top rated (5 reviews or more).
    r := NULL;
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND x->>'km' IS NOT NULL
     ORDER BY (x->>'km')::numeric LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "closest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    ELSE
      SELECT x INTO r FROM jsonb_array_elements(v_rows) x
       WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'reviews')::int >= 5
       ORDER BY (x->>'rating')::numeric DESC, (x->>'score')::numeric DESC LIMIT 1;
      IF r IS NOT NULL THEN
        v_pick := v_pick || jsonb_build_array(r || '{"label": "top_rated"}');
        v_used := v_used || (r->>'business_id')::uuid;
      END IF;
    END IF;

    -- Fill to three by score.
    FOR r IN SELECT x FROM jsonb_array_elements(v_rows) x WHERE (x->>'business_id')::uuid <> ALL (v_used) LOOP
      EXIT WHEN jsonb_array_length(v_pick) >= 3;
      v_pick := v_pick || jsonb_build_array(r || '{"label": "another"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END LOOP;
  END IF;

  -- Nothing in the window: the nearest times outside it, from up to two businesses.
  IF jsonb_array_length(v_pick) = 0 THEN
    SELECT coalesce(jsonb_agg(o ORDER BY o->>'starts'), '[]'::jsonb) INTO v_later
      FROM (
        SELECT DISTINCT ON (e.bid) jsonb_build_object(
                 'business_id', e.bid, 'business_name', b.business_name, 'slug', b.slug, 'service_id', e.sid,
                 'service_name', s.service_name, 'people', v_people, 'mode', coalesce(p_mode, s.modes[1]),
                 'date', e.day, 'time', to_char(e.at, 'HH24:MI'), 'starts', (e.day + e.at), 'km', round(e.km, 1),
                 'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 'currency', b.currency,
                 'label', 'later') AS o
          FROM pg_temp.engine_slots e
          JOIN public.businesses b ON b.id = e.bid
          JOIN public.services s ON s.id = e.sid
         ORDER BY e.bid,
                  CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at))) ELSE extract(epoch FROM (e.day + e.at)) END
      ) y
     LIMIT 2;
    SELECT coalesce(jsonb_agg(z), '[]'::jsonb) INTO v_later FROM (SELECT z FROM jsonb_array_elements(v_later) z LIMIT 2) q;
  END IF;

  RETURN jsonb_build_object(
    'options', v_pick,
    'later', coalesce(v_later, '[]'::jsonb),
    'matched', v_matched,
    'words', to_jsonb(v_tokens),
    'dates', to_jsonb(v_dates),
    'timezone', v_tz
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.engine_fit(text[], text, text) FROM PUBLIC, anon, authenticated;

-- 4. The suggestion chips: the categories with the most live businesses in the city.
CREATE OR REPLACE FUNCTION public.engine_popular(p_market text)
RETURNS TABLE (category text, businesses bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.category, count(*) FROM public.businesses b
   WHERE b.is_active = true AND b.market = p_market AND coalesce(b.is_demo, false) = false
     AND b.category IS NOT NULL AND b.category <> 'other'
   GROUP BY b.category
   ORDER BY count(*) DESC, b.category
   LIMIT 6;
$$;

REVOKE EXECUTE ON FUNCTION public.engine_popular(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_popular(text) TO anon, authenticated, service_role;

COMMIT;
