-- browse2: "Asked for this week, not here yet" on Browse (design pass, 18 October). The places where
-- people searched for a trade and found nobody to book, said as a trade and a place, never as words
-- someone typed. Only the trades in public.trade_words (built from the category list) are ever said,
-- only a place with at least 3 such searches, and only counts. Safe to run again.

BEGIN;

-- The words that name a trade, and the trade they name. Read only by public_asked below.
CREATE TABLE IF NOT EXISTS public.trade_words (
  word text PRIMARY KEY CHECK (word ~ '^[a-z]{3,30}$'),
  category text NOT NULL CHECK (length(category) <= 40)
);
ALTER TABLE public.trade_words ENABLE ROW LEVEL SECURITY;
-- No policies: only the function below reads it.

INSERT INTO public.trade_words (word, category) VALUES
  ('accountant', 'accountant'), ('accountants', 'accountant'), ('acrylic', 'nails'), ('acrylics', 'nails'),
  ('acupunctura', 'acupuncture'), ('acupuncturas', 'acupuncture'), ('acupuncture', 'acupuncture'),
  ('acupunctures', 'acupuncture'), ('acupuntura', 'acupuncture'), ('acupunturas', 'acupuncture'),
  ('adviser', 'financial_adviser'), ('advisers', 'financial_adviser'), ('advocacia', 'lawyer'),
  ('advocacias', 'lawyer'), ('advogado', 'lawyer'), ('advogados', 'lawyer'), ('aesthetic', 'aesthetic_clinic'),
  ('aesthetics', 'aesthetic_clinic'), ('afro', 'braids'), ('afros', 'braids'), ('alfaiate', 'tailor'),
  ('alfaiates', 'tailor'), ('alignment', 'tyres'), ('alignments', 'tyres'), ('alteration', 'tailor'),
  ('alterations', 'tailor'), ('appliance', 'appliance_repair'), ('appliances', 'appliance_repair'),
  ('arranjo', 'tailor'), ('arranjos', 'tailor'), ('assembly', 'handyman'), ('assemblys', 'handyman'),
  ('banho', 'pet_grooming'), ('banhos', 'pet_grooming'), ('barbearia', 'barbershop'), ('barbearias', 'barbershop'),
  ('barbeiro', 'barbershop'), ('barbeiros', 'barbershop'), ('barber', 'barbershop'), ('barbers', 'barbershop'),
  ('barbershop', 'barbershop'), ('barbershops', 'barbershop'), ('bath', 'pet_grooming'), ('baths', 'pet_grooming'),
  ('beard', 'barbershop'), ('beards', 'barbershop'), ('beauty', 'beauty_salon'), ('beautys', 'beauty_salon'),
  ('beleza', 'beauty_salon'), ('belezas', 'beauty_salon'), ('bem', 'spa'), ('bems', 'spa'),
  ('bicicleta', 'bike_repair'), ('bicicletas', 'bike_repair'), ('bike', 'bike_repair'), ('bikes', 'bike_repair'),
  ('blow', 'hair_salon'), ('blows', 'hair_salon'), ('botox', 'aesthetic_clinic'), ('botoxs', 'aesthetic_clinic'),
  ('box', 'braids'), ('boxe', 'martial_arts'), ('boxes', 'martial_arts'), ('boxs', 'braids'), ('braid', 'braids'),
  ('braiding', 'braids'), ('braidings', 'braids'), ('braids', 'braids'), ('brand', 'design_studio'),
  ('branding', 'design_studio'), ('brandings', 'design_studio'), ('brands', 'design_studio'), ('bridal', 'makeup'),
  ('bridals', 'makeup'), ('bronze', 'tanning'), ('bronzeamento', 'tanning'), ('bronzeamentos', 'tanning'),
  ('bronzes', 'tanning'), ('brow', 'lashes_brows'), ('brows', 'lashes_brows'), ('brush', 'pet_grooming'),
  ('brushs', 'pet_grooming'), ('cabeleireiro', 'hair_salon'), ('cabeleireiros', 'hair_salon'),
  ('cabelo', 'hair_salon'), ('cabelos', 'hair_salon'), ('canalizador', 'plumber'), ('canalizadors', 'plumber'),
  ('car', 'car_wash'), ('cars', 'car_wash'), ('carta', 'driving_school'), ('cartas', 'driving_school'),
  ('casamento', 'event_planner'), ('casamentos', 'event_planner'), ('cera', 'hair_removal'),
  ('ceramica', 'art_classes'), ('ceramicas', 'art_classes'), ('ceras', 'hair_removal'),
  ('chiropractor', 'chiropractor'), ('chiropractors', 'chiropractor'), ('clean', 'cleaning'), ('cleaner', 'cleaning'),
  ('cleaners', 'cleaning'), ('cleaning', 'cleaning'), ('cleanings', 'cleaning'), ('cleans', 'cleaning'),
  ('cleanse', 'skincare'), ('cleanses', 'skincare'), ('clip', 'pet_grooming'), ('clips', 'pet_grooming'),
  ('coach', 'coach'), ('coaching', 'coach'), ('coachings', 'coach'), ('coachs', 'coach'),
  ('computadore', 'tech_repair'), ('computadores', 'tech_repair'), ('computer', 'tech_repair'),
  ('computers', 'tech_repair'), ('conducao', 'driving_school'), ('conducaos', 'driving_school'),
  ('consultant', 'consultant'), ('consultants', 'consultant'), ('consultor', 'consultant'),
  ('consultoria', 'consultant'), ('consultorias', 'consultant'), ('consultors', 'consultant'),
  ('contabilidade', 'accountant'), ('contabilidades', 'accountant'), ('contabilista', 'accountant'),
  ('contabilistas', 'accountant'), ('conversation', 'language_school'), ('conversations', 'language_school'),
  ('cornrow', 'braids'), ('cornrows', 'braids'), ('costureira', 'tailor'), ('costureiras', 'tailor'),
  ('cowork', 'coworking'), ('coworking', 'coworking'), ('coworkings', 'coworking'), ('coworks', 'coworking'),
  ('craft', 'art_classes'), ('crafts', 'art_classes'), ('cut', 'barbershop'), ('cuts', 'barbershop'),
  ('danca', 'dance'), ('dancas', 'dance'), ('dance', 'dance'), ('dances', 'dance'), ('dentaria', 'dentist'),
  ('dentarias', 'dentist'), ('dentist', 'dentist'), ('dentista', 'dentist'), ('dentistas', 'dentist'),
  ('dentists', 'dentist'), ('depilacao', 'hair_removal'), ('depilacaos', 'hair_removal'),
  ('desenvolvimento', 'web_studio'), ('desenvolvimentos', 'web_studio'), ('design', 'design_studio'),
  ('designs', 'design_studio'), ('detailing', 'car_wash'), ('detailings', 'car_wash'), ('detalhe', 'car_wash'),
  ('detalhes', 'car_wash'), ('diagnosi', 'appliance_repair'), ('diagnosis', 'appliance_repair'),
  ('dieta', 'nutritionist'), ('dietas', 'nutritionist'), ('dog', 'dog_training'), ('dogs', 'dog_training'),
  ('dread', 'braids'), ('dreadlock', 'braids'), ('dreadlocks', 'braids'), ('dreads', 'braids'),
  ('driving', 'driving_school'), ('drivings', 'driving_school'), ('dry', 'hair_salon'), ('drys', 'hair_salon'),
  ('electrician', 'electrician'), ('electricians', 'electrician'), ('electricista', 'electrician'),
  ('electricistas', 'electrician'), ('eletricista', 'electrician'), ('eletricistas', 'electrician'),
  ('eletrodomestico', 'appliance_repair'), ('eletrodomesticos', 'appliance_repair'), ('escritorio', 'coworking'),
  ('escritorios', 'coworking'), ('estar', 'spa'), ('estars', 'spa'), ('estate', 'real_estate'),
  ('estates', 'real_estate'), ('estetica', 'skincare'), ('esteticas', 'skincare'), ('estudio', 'gym'),
  ('estudios', 'gym'), ('evento', 'event_planner'), ('eventos', 'event_planner'), ('exam', 'tutoring'),
  ('exame', 'tutoring'), ('exames', 'tutoring'), ('exams', 'tutoring'), ('explicacoe', 'tutoring'),
  ('explicacoes', 'tutoring'), ('explicador', 'tutoring'), ('explicadors', 'tutoring'), ('exterior', 'car_wash'),
  ('exteriors', 'car_wash'), ('eyelash', 'lashes_brows'), ('eyelashe', 'lashes_brows'), ('eyelashes', 'lashes_brows'),
  ('eyelashs', 'lashes_brows'), ('facial', 'skincare'), ('facials', 'skincare'), ('fade', 'barbershop'),
  ('fades', 'barbershop'), ('fala', 'speech_therapy'), ('falas', 'speech_therapy'), ('faz', 'handyman'),
  ('fazs', 'handyman'), ('financeiro', 'financial_adviser'), ('financeiros', 'financial_adviser'),
  ('financial', 'financial_adviser'), ('financials', 'financial_adviser'), ('fisioterapeuta', 'physio'),
  ('fisioterapeutas', 'physio'), ('fisioterapia', 'physio'), ('fisioterapias', 'physio'),
  ('fotografia', 'photographer'), ('fotografias', 'photographer'), ('fotografo', 'photographer'),
  ('fotografos', 'photographer'), ('furniture', 'handyman'), ('furnitures', 'handyman'), ('garage', 'mechanic'),
  ('garages', 'mechanic'), ('garden', 'gardening'), ('gardening', 'gardening'), ('gardenings', 'gardening'),
  ('gardens', 'gardening'), ('gel', 'nails'), ('gels', 'nails'), ('ginasio', 'gym'), ('ginasios', 'gym'),
  ('grafico', 'design_studio'), ('graficos', 'design_studio'), ('groom', 'pet_grooming'), ('grooming', 'pet_grooming'),
  ('groomings', 'pet_grooming'), ('grooms', 'pet_grooming'), ('guitarra', 'music_lessons'),
  ('guitarras', 'music_lessons'), ('gym', 'gym'), ('gyms', 'gym'), ('hair', 'hair_salon'), ('haircut', 'barbershop'),
  ('haircuts', 'barbershop'), ('hairs', 'hair_salon'), ('handyman', 'handyman'), ('handymans', 'handyman'),
  ('headshot', 'photographer'), ('headshots', 'photographer'), ('hedge', 'gardening'), ('hedges', 'gardening'),
  ('highlight', 'hair_salon'), ('highlights', 'hair_salon'), ('imobiliaria', 'real_estate'),
  ('imobiliarias', 'real_estate'), ('induction', 'gym'), ('inductions', 'gym'), ('ingle', 'language_school'),
  ('ingles', 'language_school'), ('interior', 'car_wash'), ('interiors', 'car_wash'),
  ('investimento', 'financial_adviser'), ('investimentos', 'financial_adviser'), ('ioga', 'yoga'), ('iogas', 'yoga'),
  ('jardinagem', 'gardening'), ('jardinagems', 'gardening'), ('jardineiro', 'gardening'), ('jardineiros', 'gardening'),
  ('jitsu', 'martial_arts'), ('jitsus', 'martial_arts'), ('jiu', 'martial_arts'), ('jius', 'martial_arts'),
  ('karate', 'martial_arts'), ('karates', 'martial_arts'), ('knotles', 'braids'), ('knotless', 'braids'),
  ('language', 'language_school'), ('languages', 'language_school'), ('laser', 'hair_removal'),
  ('lasers', 'hair_removal'), ('lash', 'lashes_brows'), ('lashe', 'lashes_brows'), ('lashes', 'lashes_brows'),
  ('lashs', 'lashes_brows'), ('lavagem', 'car_wash'), ('lavagems', 'car_wash'), ('lawyer', 'lawyer'),
  ('lawyers', 'lawyer'), ('legs', 'hair_removal'), ('limpeza', 'skincare'), ('limpezas', 'cleaning'),
  ('lineup', 'barbershop'), ('lineups', 'barbershop'), ('lingua', 'language_school'), ('linguas', 'language_school'),
  ('locs', 'braids'), ('make', 'makeup'), ('makes', 'makeup'), ('makeup', 'makeup'), ('makeups', 'makeup'),
  ('manicure', 'nails'), ('manicures', 'nails'), ('maquiagem', 'makeup'), ('maquiagems', 'makeup'),
  ('maquilhagem', 'makeup'), ('maquilhagems', 'makeup'), ('marciai', 'martial_arts'), ('marciais', 'martial_arts'),
  ('marketing', 'marketing_agency'), ('marketings', 'marketing_agency'), ('martial', 'martial_arts'),
  ('martials', 'martial_arts'), ('massage', 'massage'), ('massagem', 'massage'), ('massagems', 'massage'),
  ('massages', 'massage'), ('masseuse', 'massage'), ('masseuses', 'massage'), ('mat', 'pilates'), ('mats', 'pilates'),
  ('mecanico', 'mechanic'), ('mecanicos', 'mechanic'), ('mechanic', 'mechanic'), ('mechanics', 'mechanic'),
  ('medical', 'medical_clinic'), ('medicals', 'medical_clinic'), ('mentor', 'coach'), ('mentors', 'coach'),
  ('mua', 'makeup'), ('muas', 'makeup'), ('music', 'music_lessons'), ('musica', 'music_lessons'),
  ('musicas', 'music_lessons'), ('musics', 'music_lessons'), ('nail', 'nails'), ('nails', 'nails'),
  ('natacao', 'swimming'), ('natacaos', 'swimming'), ('natural', 'braids'), ('naturals', 'braids'),
  ('notario', 'notary'), ('notarios', 'notary'), ('notary', 'notary'), ('notarys', 'notary'),
  ('nutricao', 'nutritionist'), ('nutricaos', 'nutritionist'), ('nutricionista', 'nutritionist'),
  ('nutricionistas', 'nutritionist'), ('nutritionist', 'nutritionist'), ('nutritionists', 'nutritionist'),
  ('oficina', 'mechanic'), ('oficinas', 'mechanic'), ('organizacao', 'event_planner'),
  ('organizacaos', 'event_planner'), ('osteopata', 'osteopathy'), ('osteopatas', 'osteopathy'),
  ('osteopathy', 'osteopathy'), ('osteopathys', 'osteopathy'), ('osteopatia', 'osteopathy'),
  ('osteopatias', 'osteopathy'), ('passeio', 'dog_training'), ('passeios', 'dog_training'), ('pedicure', 'nails'),
  ('pedicures', 'nails'), ('peel', 'skincare'), ('peels', 'skincare'), ('pele', 'skincare'), ('peles', 'skincare'),
  ('personal', 'personal_trainer'), ('personals', 'personal_trainer'), ('pestana', 'lashes_brows'),
  ('pestanas', 'lashes_brows'), ('pet', 'pet_grooming'), ('pets', 'pet_grooming'), ('phone', 'tech_repair'),
  ('phones', 'tech_repair'), ('photo', 'photographer'), ('photographer', 'photographer'),
  ('photographers', 'photographer'), ('photos', 'photographer'), ('photoshoot', 'photographer'),
  ('photoshoots', 'photographer'), ('physiotherapy', 'physio'), ('physiotherapys', 'physio'),
  ('piano', 'music_lessons'), ('pianos', 'music_lessons'), ('picheleiro', 'plumber'), ('picheleiros', 'plumber'),
  ('piercing', 'tattoo'), ('piercings', 'tattoo'), ('pilate', 'pilates'), ('pilates', 'pilates'),
  ('piscina', 'swimming'), ('piscinas', 'swimming'), ('planner', 'event_planner'), ('planners', 'event_planner'),
  ('planning', 'event_planner'), ('plannings', 'event_planner'), ('plumber', 'plumber'), ('plumbers', 'plumber'),
  ('pneu', 'tyres'), ('pneus', 'tyres'), ('podiatry', 'podiatry'), ('podiatrys', 'podiatry'),
  ('podologia', 'podiatry'), ('podologias', 'podiatry'), ('podologo', 'podiatry'), ('podologos', 'podiatry'),
  ('portrait', 'photographer'), ('portraits', 'photographer'), ('portugue', 'language_school'),
  ('portugues', 'language_school'), ('prep', 'tutoring'), ('preps', 'tutoring'), ('psicologa', 'therapist'),
  ('psicologas', 'therapist'), ('psicologo', 'therapist'), ('psicologos', 'therapist'), ('psychologist', 'therapist'),
  ('psychologists', 'therapist'), ('puncture', 'bike_repair'), ('punctures', 'bike_repair'),
  ('quiropratico', 'chiropractor'), ('quiropraticos', 'chiropractor'), ('quiropraxia', 'chiropractor'),
  ('quiropraxias', 'chiropractor'), ('real', 'real_estate'), ('reals', 'real_estate'), ('rede', 'marketing_agency'),
  ('redes', 'marketing_agency'), ('reformer', 'pilates'), ('reformers', 'pilates'), ('rehab', 'physio'),
  ('rehabs', 'physio'), ('relaxing', 'massage'), ('relaxings', 'massage'), ('removal', 'hair_removal'),
  ('removals', 'hair_removal'), ('replacement', 'tech_repair'), ('replacements', 'tech_repair'),
  ('reunioe', 'coworking'), ('reunioes', 'coworking'), ('revisao', 'mechanic'), ('revisaos', 'mechanic'),
  ('rooms', 'coworking'), ('sapateiro', 'shoe_repair'), ('sapateiros', 'shoe_repair'), ('sapato', 'shoe_repair'),
  ('sapatos', 'shoe_repair'), ('shave', 'barbershop'), ('shaves', 'barbershop'), ('shoe', 'shoe_repair'),
  ('shoes', 'shoe_repair'), ('shoot', 'photographer'), ('shoots', 'photographer'), ('skin', 'barbershop'),
  ('skincare', 'skincare'), ('skincares', 'skincare'), ('skins', 'barbershop'), ('sobrancelha', 'lashes_brows'),
  ('sobrancelhas', 'lashes_brows'), ('sociai', 'marketing_agency'), ('sociais', 'marketing_agency'),
  ('software', 'web_studio'), ('softwares', 'web_studio'), ('solo', 'dog_training'), ('solos', 'dog_training'),
  ('spa', 'spa'), ('spas', 'spa'), ('speech', 'speech_therapy'), ('speechs', 'speech_therapy'), ('sport', 'massage'),
  ('sports', 'massage'), ('spray', 'tanning'), ('sprays', 'tanning'), ('swimming', 'swimming'),
  ('swimmings', 'swimming'), ('tailor', 'tailor'), ('tailors', 'tailor'), ('tan', 'tanning'), ('tanning', 'tanning'),
  ('tannings', 'tanning'), ('tans', 'tanning'), ('tattoo', 'tattoo'), ('tattoos', 'tattoo'), ('tatuagem', 'tattoo'),
  ('tatuagems', 'tattoo'), ('tax', 'accountant'), ('taxs', 'accountant'), ('telemovei', 'tech_repair'),
  ('telemoveis', 'tech_repair'), ('terapeuta', 'therapist'), ('terapeutas', 'therapist'), ('terapia', 'therapist'),
  ('terapias', 'therapist'), ('theory', 'driving_school'), ('theorys', 'driving_school'), ('therapist', 'therapist'),
  ('therapists', 'therapist'), ('therapy', 'speech_therapy'), ('therapys', 'speech_therapy'), ('tissue', 'massage'),
  ('tissues', 'massage'), ('tosquia', 'pet_grooming'), ('tosquias', 'pet_grooming'), ('trainer', 'personal_trainer'),
  ('trainers', 'personal_trainer'), ('training', 'dog_training'), ('trainings', 'dog_training'), ('tranca', 'braids'),
  ('trancas', 'braids'), ('treinador', 'personal_trainer'), ('treinadors', 'personal_trainer'),
  ('treino', 'dog_training'), ('treinos', 'dog_training'), ('trim', 'barbershop'), ('trimming', 'gardening'),
  ('trimmings', 'gardening'), ('trims', 'barbershop'), ('tudo', 'handyman'), ('tudos', 'handyman'),
  ('tutor', 'tutoring'), ('tutoring', 'tutoring'), ('tutorings', 'tutoring'), ('tutors', 'tutoring'),
  ('twist', 'braids'), ('twists', 'braids'), ('tyres', 'tyres'), ('underarm', 'hair_removal'),
  ('underarms', 'hair_removal'), ('unha', 'nails'), ('unhas', 'nails'), ('vaccination', 'vet'),
  ('vaccinations', 'vet'), ('valet', 'car_wash'), ('valets', 'car_wash'), ('valuation', 'real_estate'),
  ('valuations', 'real_estate'), ('venue', 'venue'), ('venues', 'venue'), ('vet', 'vet'), ('veterinario', 'vet'),
  ('veterinarios', 'vet'), ('vets', 'vet'), ('video', 'videographer'), ('videografo', 'videographer'),
  ('videografos', 'videographer'), ('videographer', 'videographer'), ('videographers', 'videographer'),
  ('videos', 'videographer'), ('viewing', 'real_estate'), ('viewings', 'real_estate'), ('walk', 'dog_training'),
  ('walking', 'dog_training'), ('walkings', 'dog_training'), ('walks', 'dog_training'), ('wax', 'hair_removal'),
  ('waxing', 'hair_removal'), ('waxings', 'hair_removal'), ('waxs', 'hair_removal'), ('weave', 'braids'),
  ('weaves', 'braids'), ('website', 'web_studio'), ('websites', 'web_studio'), ('wig', 'braids'), ('wigs', 'braids'),
  ('yoga', 'yoga'), ('yogas', 'yoga')
ON CONFLICT (word) DO UPDATE SET category = EXCLUDED.category;

-- Up to three places in a country (p_country 'NG' or 'PT') where a trade was searched and nobody
-- offered it, in the last p_days days: [{ zone, category, searches }], most searched first, one row per
-- place (its most asked trade). A search names one trade: a specific one over a general salon.
CREATE OR REPLACE FUNCTION public.public_asked(p_country text, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_country text := upper(nullif(btrim(coalesce(p_country, '')), ''));
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 31)));
BEGIN
  IF v_country IS NULL OR v_country NOT IN ('NG', 'PT') THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN coalesce((
    WITH miss AS (
      SELECT l.id, btrim(l.zone) AS zone, l.query
        FROM public.search_log l
       WHERE l.created_at >= v_since
         AND coalesce(l.offered = 0, false)
         AND public.market_country(l.market) = v_country
         AND l.zone IS NOT NULL
         AND btrim(l.zone) ~ '^[^0-9@+/:#_]{2,40}$'
    ),
    hit AS (
      SELECT m.id, lower(m.zone) AS lz, m.zone, t.category, count(*) AS n
        FROM miss m
        CROSS JOIN LATERAL regexp_split_to_table(public.engine_fold(m.query), '[^a-z]+') AS tok
        JOIN public.trade_words t ON t.word = tok
       GROUP BY m.id, lower(m.zone), m.zone, t.category
    ),
    one AS (
      SELECT DISTINCT ON (h.id) h.id, h.lz, h.zone, h.category
        FROM hit h
       ORDER BY h.id, (h.category IN ('hair_salon', 'beauty_salon', 'spa')), h.n DESC, h.category
    ),
    per AS (
      SELECT o.lz, min(o.zone) AS zone, o.category, count(*) AS searches
        FROM one o GROUP BY o.lz, o.category
    ),
    top AS (
      SELECT DISTINCT ON (p.lz) p.lz, p.zone, p.category, p.searches
        FROM per p WHERE p.searches >= 3
       ORDER BY p.lz, p.searches DESC, p.category
    )
    SELECT jsonb_agg(jsonb_build_object('zone', x.zone, 'category', x.category, 'searches', x.searches) ORDER BY x.searches DESC, x.zone)
      FROM (SELECT * FROM top ORDER BY searches DESC, zone LIMIT 3) x
  ), '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.public_asked(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_asked(text, integer) TO anon, authenticated, service_role;

COMMIT;
