-- geo2: a business joins anywhere in Nigeria or Portugal (doc 35). Run before installing the kit.
--   1. A business outside our three cities belongs to its country's market (ng, pt) instead of none,
--      and its currency follows the country.
--   2. Payment rules for those markets, copied from Lagos (ng) and Porto (pt), so paying at booking
--      and payouts work for them as for the cities.
--   3. Areas for visits at the client's place anywhere: Nigeria's 36 states and the FCT, Portugal's
--      308 municipalities. The city lists (Lagos, Porto, Lisbon) stay as they are.
--   4. The owner can pin the shop where they stand (set_my_shop_spot). A pin from the phone has no
--      Google place id, so it is never refreshed or forgotten; only Google's spots expire at 30 days.
-- Safe to run again.

BEGIN;

-- 1. The market and currency follow the place.
CREATE OR REPLACE FUNCTION public.businesses_market()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.market := coalesce(public.market_for(NEW.country, NEW.city),
                         CASE NEW.country WHEN 'NG' THEN 'ng' WHEN 'PT' THEN 'pt' END);
  NEW.currency := CASE NEW.country WHEN 'NG' THEN 'NGN' WHEN 'PT' THEN 'EUR' ELSE NEW.currency END;
  RETURN NEW;
END;
$$;

-- Any business in Nigeria or Portugal still without a market gets one now (the trigger runs on city).
UPDATE public.businesses SET city = city WHERE (market IS NULL OR currency IS NULL) AND country IN ('NG', 'PT');

-- 2. Payment rules for the country markets, as the city they were copied from.
INSERT INTO public.market_rules (market, client_fee_pct, client_fee_min, client_fee_max, business_fee_pct, business_fee_fixed,
  first_month_free, methods, hold_minutes_card, hold_minutes_transfer, late_cancel_fee_max_pct, no_show_fee_pct,
  dispute_window_hours, confirmed, free_cancel_hours, business_fee_vat_pct, client_fee_bands)
SELECT x.code, r.client_fee_pct, r.client_fee_min, r.client_fee_max, r.business_fee_pct, r.business_fee_fixed,
       r.first_month_free, r.methods, r.hold_minutes_card, r.hold_minutes_transfer, r.late_cancel_fee_max_pct, r.no_show_fee_pct,
       r.dispute_window_hours, r.confirmed, r.free_cancel_hours, r.business_fee_vat_pct, r.client_fee_bands
  FROM (VALUES ('ng', 'lagos'), ('pt', 'porto')) AS x(code, src)
  JOIN public.market_rules r ON r.market = x.src
 WHERE EXISTS (SELECT 1 FROM public.markets m WHERE m.code = x.code)
   AND NOT EXISTS (SELECT 1 FROM public.market_rules y WHERE y.market = x.code);

-- 3. Areas: every state in Nigeria, every municipality in Portugal.
INSERT INTO public.market_zones (market, name, sort_order) VALUES
  ('ng', 'Abia', 0), ('ng', 'Adamawa', 1), ('ng', 'Akwa Ibom', 2), ('ng', 'Anambra', 3), ('ng', 'Bauchi', 4),
  ('ng', 'Bayelsa', 5), ('ng', 'Benue', 6), ('ng', 'Borno', 7), ('ng', 'Cross River', 8), ('ng', 'Delta', 9),
  ('ng', 'Ebonyi', 10), ('ng', 'Edo', 11), ('ng', 'Ekiti', 12), ('ng', 'Enugu', 13), ('ng', 'FCT', 14),
  ('ng', 'Gombe', 15), ('ng', 'Imo', 16), ('ng', 'Jigawa', 17), ('ng', 'Kaduna', 18), ('ng', 'Kano', 19),
  ('ng', 'Katsina', 20), ('ng', 'Kebbi', 21), ('ng', 'Kogi', 22), ('ng', 'Kwara', 23), ('ng', 'Lagos', 24),
  ('ng', 'Nasarawa', 25), ('ng', 'Niger', 26), ('ng', 'Ogun', 27), ('ng', 'Ondo', 28), ('ng', 'Osun', 29),
  ('ng', 'Oyo', 30), ('ng', 'Plateau', 31), ('ng', 'Rivers', 32), ('ng', 'Sokoto', 33), ('ng', 'Taraba', 34),
  ('ng', 'Yobe', 35), ('ng', 'Zamfara', 36)
ON CONFLICT (market, name) DO NOTHING;

INSERT INTO public.market_zones (market, name, sort_order) VALUES
  ('pt', 'Abrantes', 0), ('pt', 'Aguiar da Beira', 1), ('pt', 'Alandroal', 2), ('pt', 'Albergaria-a-Velha', 3),
  ('pt', 'Albufeira', 4), ('pt', 'Alcanena', 5), ('pt', 'Alcobaça', 6), ('pt', 'Alcochete', 7),
  ('pt', 'Alcoutim', 8), ('pt', 'Alcácer do Sal', 9), ('pt', 'Alenquer', 10), ('pt', 'Alfândega da Fé', 11),
  ('pt', 'Alijó', 12), ('pt', 'Aljezur', 13), ('pt', 'Aljustrel', 14), ('pt', 'Almada', 15), ('pt', 'Almeida', 16),
  ('pt', 'Almeirim', 17), ('pt', 'Almodôvar', 18), ('pt', 'Alpiarça', 19), ('pt', 'Alter do Chão', 20),
  ('pt', 'Alvaiázere', 21), ('pt', 'Alvito', 22), ('pt', 'Amadora', 23), ('pt', 'Amarante', 24),
  ('pt', 'Amares', 25), ('pt', 'Anadia', 26), ('pt', 'Angra do Heroísmo', 27), ('pt', 'Ansião', 28),
  ('pt', 'Arcos de Valdevez', 29), ('pt', 'Arganil', 30), ('pt', 'Armamar', 31), ('pt', 'Arouca', 32),
  ('pt', 'Arraiolos', 33), ('pt', 'Arronches', 34), ('pt', 'Arruda dos Vinhos', 35), ('pt', 'Aveiro', 36),
  ('pt', 'Avis', 37), ('pt', 'Azambuja', 38), ('pt', 'Baião', 39), ('pt', 'Barcelos', 40), ('pt', 'Barrancos', 41),
  ('pt', 'Barreiro', 42), ('pt', 'Batalha', 43), ('pt', 'Beja', 44), ('pt', 'Belmonte', 45), ('pt', 'Benavente', 46),
  ('pt', 'Bombarral', 47), ('pt', 'Borba', 48), ('pt', 'Boticas', 49), ('pt', 'Braga', 50), ('pt', 'Bragança', 51),
  ('pt', 'Cabeceiras de Basto', 52), ('pt', 'Cadaval', 53), ('pt', 'Caldas da Rainha', 54), ('pt', 'Calheta', 55),
  ('pt', 'Calheta (São Jorge)', 56), ('pt', 'Caminha', 57), ('pt', 'Campo Maior', 58), ('pt', 'Cantanhede', 59),
  ('pt', 'Carrazeda de Ansiães', 60), ('pt', 'Carregal do Sal', 61), ('pt', 'Cartaxo', 62), ('pt', 'Cascais', 63),
  ('pt', 'Castanheira de Pêra', 64), ('pt', 'Castelo Branco', 65), ('pt', 'Castelo de Paiva', 66),
  ('pt', 'Castelo de Vide', 67), ('pt', 'Castro Daire', 68), ('pt', 'Castro Marim', 69), ('pt', 'Castro Verde', 70),
  ('pt', 'Celorico da Beira', 71), ('pt', 'Celorico de Basto', 72), ('pt', 'Chamusca', 73), ('pt', 'Chaves', 74),
  ('pt', 'Cinfães', 75), ('pt', 'Coimbra', 76), ('pt', 'Condeixa-a-Nova', 77), ('pt', 'Constância', 78),
  ('pt', 'Coruche', 79), ('pt', 'Corvo', 80), ('pt', 'Covilhã', 81), ('pt', 'Crato', 82), ('pt', 'Cuba', 83),
  ('pt', 'Câmara de Lobos', 84), ('pt', 'Elvas', 85), ('pt', 'Entroncamento', 86), ('pt', 'Espinho', 87),
  ('pt', 'Esposende', 88), ('pt', 'Estarreja', 89), ('pt', 'Estremoz', 90), ('pt', 'Fafe', 91), ('pt', 'Faro', 92),
  ('pt', 'Felgueiras', 93), ('pt', 'Ferreira do Alentejo', 94), ('pt', 'Ferreira do Zêzere', 95),
  ('pt', 'Figueira da Foz', 96), ('pt', 'Figueira de Castelo Rodrigo', 97), ('pt', 'Figueiró dos Vinhos', 98),
  ('pt', 'Fornos de Algodres', 99), ('pt', 'Freixo de Espada à Cinta', 100), ('pt', 'Fronteira', 101),
  ('pt', 'Funchal', 102), ('pt', 'Fundão', 103), ('pt', 'Gavião', 104), ('pt', 'Golegã', 105),
  ('pt', 'Gondomar', 106), ('pt', 'Gouveia', 107), ('pt', 'Grândola', 108), ('pt', 'Guarda', 109),
  ('pt', 'Guimarães', 110), ('pt', 'Góis', 111), ('pt', 'Horta', 112), ('pt', 'Idanha-a-Nova', 113),
  ('pt', 'Lagoa', 114), ('pt', 'Lagoa (Azores)', 115), ('pt', 'Lagos', 116), ('pt', 'Lajes das Flores', 117),
  ('pt', 'Lajes do Pico', 118), ('pt', 'Lamego', 119), ('pt', 'Leiria', 120), ('pt', 'Lisboa', 121),
  ('pt', 'Loulé', 122), ('pt', 'Loures', 123), ('pt', 'Lourinhã', 124), ('pt', 'Lousada', 125), ('pt', 'Lousã', 126),
  ('pt', 'Macedo de Cavaleiros', 127), ('pt', 'Machico', 128), ('pt', 'Madalena', 129), ('pt', 'Mafra', 130),
  ('pt', 'Maia', 131), ('pt', 'Mangualde', 132), ('pt', 'Manteigas', 133), ('pt', 'Marco de Canaveses', 134),
  ('pt', 'Marinha Grande', 135), ('pt', 'Marvão', 136), ('pt', 'Matosinhos', 137), ('pt', 'Mação', 138),
  ('pt', 'Mealhada', 139), ('pt', 'Melgaço', 140), ('pt', 'Mesão Frio', 141), ('pt', 'Mira', 142),
  ('pt', 'Miranda do Corvo', 143), ('pt', 'Miranda do Douro', 144), ('pt', 'Mirandela', 145),
  ('pt', 'Mogadouro', 146), ('pt', 'Moimenta da Beira', 147), ('pt', 'Moita', 148), ('pt', 'Monchique', 149),
  ('pt', 'Mondim de Basto', 150), ('pt', 'Monforte', 151), ('pt', 'Montalegre', 152), ('pt', 'Montemor-o-Novo', 153),
  ('pt', 'Montemor-o-Velho', 154), ('pt', 'Montijo', 155), ('pt', 'Monção', 156), ('pt', 'Mora', 157),
  ('pt', 'Mortágua', 158), ('pt', 'Moura', 159), ('pt', 'Mourão', 160), ('pt', 'Murtosa', 161), ('pt', 'Murça', 162),
  ('pt', 'Mértola', 163), ('pt', 'Mêda', 164), ('pt', 'Nazaré', 165), ('pt', 'Nelas', 166), ('pt', 'Nisa', 167),
  ('pt', 'Nordeste', 168), ('pt', 'Odemira', 169), ('pt', 'Odivelas', 170), ('pt', 'Oeiras', 171),
  ('pt', 'Oleiros', 172), ('pt', 'Olhão', 173), ('pt', 'Oliveira de Azeméis', 174),
  ('pt', 'Oliveira de Frades', 175), ('pt', 'Oliveira do Bairro', 176), ('pt', 'Oliveira do Hospital', 177),
  ('pt', 'Ourique', 178), ('pt', 'Ourém', 179), ('pt', 'Ovar', 180), ('pt', 'Palmela', 181),
  ('pt', 'Pampilhosa da Serra', 182), ('pt', 'Paredes', 183), ('pt', 'Paredes de Coura', 184),
  ('pt', 'Paços de Ferreira', 185), ('pt', 'Pedrógão Grande', 186), ('pt', 'Penacova', 187), ('pt', 'Penafiel', 188),
  ('pt', 'Penalva do Castelo', 189), ('pt', 'Penamacor', 190), ('pt', 'Penedono', 191), ('pt', 'Penela', 192),
  ('pt', 'Peniche', 193), ('pt', 'Peso da Régua', 194), ('pt', 'Pinhel', 195), ('pt', 'Pombal', 196),
  ('pt', 'Ponta Delgada', 197), ('pt', 'Ponta do Sol', 198), ('pt', 'Ponte da Barca', 199),
  ('pt', 'Ponte de Lima', 200), ('pt', 'Ponte de Sor', 201), ('pt', 'Portalegre', 202), ('pt', 'Portel', 203),
  ('pt', 'Portimão', 204), ('pt', 'Porto', 205), ('pt', 'Porto Moniz', 206), ('pt', 'Porto Santo', 207),
  ('pt', 'Porto de Mós', 208), ('pt', 'Povoação', 209), ('pt', 'Praia da Vitória', 210),
  ('pt', 'Proença-a-Nova', 211), ('pt', 'Póvoa de Lanhoso', 212), ('pt', 'Póvoa de Varzim', 213),
  ('pt', 'Redondo', 214), ('pt', 'Reguengos de Monsaraz', 215), ('pt', 'Resende', 216), ('pt', 'Ribeira Brava', 217),
  ('pt', 'Ribeira Grande', 218), ('pt', 'Ribeira de Pena', 219), ('pt', 'Rio Maior', 220), ('pt', 'Sabrosa', 221),
  ('pt', 'Sabugal', 222), ('pt', 'Salvaterra de Magos', 223), ('pt', 'Santa Comba Dão', 224),
  ('pt', 'Santa Cruz', 225), ('pt', 'Santa Cruz da Graciosa', 226), ('pt', 'Santa Cruz das Flores', 227),
  ('pt', 'Santa Maria da Feira', 228), ('pt', 'Santa Marta de Penaguião', 229), ('pt', 'Santana', 230),
  ('pt', 'Santarém', 231), ('pt', 'Santiago do Cacém', 232), ('pt', 'Santo Tirso', 233), ('pt', 'Sardoal', 234),
  ('pt', 'Seia', 235), ('pt', 'Seixal', 236), ('pt', 'Sernancelhe', 237), ('pt', 'Serpa', 238), ('pt', 'Sertã', 239),
  ('pt', 'Sesimbra', 240), ('pt', 'Setúbal', 241), ('pt', 'Sever do Vouga', 242), ('pt', 'Silves', 243),
  ('pt', 'Sines', 244), ('pt', 'Sintra', 245), ('pt', 'Sobral de Monte Agraço', 246), ('pt', 'Soure', 247),
  ('pt', 'Sousel', 248), ('pt', 'Sátão', 249), ('pt', 'São Brás de Alportel', 250),
  ('pt', 'São João da Madeira', 251), ('pt', 'São João da Pesqueira', 252), ('pt', 'São Pedro do Sul', 253),
  ('pt', 'São Roque do Pico', 254), ('pt', 'São Vicente', 255), ('pt', 'Tabuaço', 256), ('pt', 'Tarouca', 257),
  ('pt', 'Tavira', 258), ('pt', 'Terras de Bouro', 259), ('pt', 'Tomar', 260), ('pt', 'Tondela', 261),
  ('pt', 'Torre de Moncorvo', 262), ('pt', 'Torres Novas', 263), ('pt', 'Torres Vedras', 264),
  ('pt', 'Trancoso', 265), ('pt', 'Trofa', 266), ('pt', 'Tábua', 267), ('pt', 'Vagos', 268),
  ('pt', 'Vale de Cambra', 269), ('pt', 'Valença', 270), ('pt', 'Valongo', 271), ('pt', 'Valpaços', 272),
  ('pt', 'Velas', 273), ('pt', 'Vendas Novas', 274), ('pt', 'Viana do Alentejo', 275),
  ('pt', 'Viana do Castelo', 276), ('pt', 'Vidigueira', 277), ('pt', 'Vieira do Minho', 278),
  ('pt', 'Vila Flor', 279), ('pt', 'Vila Franca de Xira', 280), ('pt', 'Vila Franca do Campo', 281),
  ('pt', 'Vila Nova da Barquinha', 282), ('pt', 'Vila Nova de Cerveira', 283), ('pt', 'Vila Nova de Famalicão', 284),
  ('pt', 'Vila Nova de Foz Côa', 285), ('pt', 'Vila Nova de Gaia', 286), ('pt', 'Vila Nova de Paiva', 287),
  ('pt', 'Vila Nova de Poiares', 288), ('pt', 'Vila Pouca de Aguiar', 289), ('pt', 'Vila Real', 290),
  ('pt', 'Vila Real de Santo António', 291), ('pt', 'Vila Velha de Ródão', 292), ('pt', 'Vila Verde', 293),
  ('pt', 'Vila Viçosa', 294), ('pt', 'Vila de Rei', 295), ('pt', 'Vila do Bispo', 296), ('pt', 'Vila do Conde', 297),
  ('pt', 'Vila do Porto', 298), ('pt', 'Vimioso', 299), ('pt', 'Vinhais', 300), ('pt', 'Viseu', 301),
  ('pt', 'Vizela', 302), ('pt', 'Vouzela', 303), ('pt', 'Águeda', 304), ('pt', 'Évora', 305), ('pt', 'Ílhavo', 306),
  ('pt', 'Óbidos', 307)
ON CONFLICT (market, name) DO NOTHING;

-- 4. The owner pins the shop where they stand.
CREATE OR REPLACE FUNCTION public.set_my_shop_spot(p_business uuid, p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_country text;
BEGIN
  IF NOT public.is_business_owner(p_business) THEN
    RAISE EXCEPTION 'Only the owner can pin the shop' USING ERRCODE = '42501';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'We could not read your position. Try again.' USING ERRCODE = '22023';
  END IF;
  SELECT b.country INTO v_country FROM public.businesses b WHERE b.id = p_business;
  -- A pin far outside the business's country is a phone somewhere else, not the shop.
  IF (v_country = 'NG' AND NOT (p_lat BETWEEN 4 AND 14 AND p_lng BETWEEN 2.5 AND 15))
     OR (v_country = 'PT' AND NOT ((p_lat BETWEEN 36.8 AND 42.2 AND p_lng BETWEEN -9.6 AND -6.1)
                                   OR (p_lat BETWEEN 32.3 AND 33.2 AND p_lng BETWEEN -17.4 AND -16.2)
                                   OR (p_lat BETWEEN 36.9 AND 39.8 AND p_lng BETWEEN -31.4 AND -24.9))) THEN
    RAISE EXCEPTION 'You seem to be away from the shop. Pin it when you are there, or find the address.' USING ERRCODE = '22023';
  END IF;
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses
     SET lat = p_lat, lng = p_lng, place_id = NULL, located_at = now()
   WHERE id = p_business;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_shop_spot(uuid, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_shop_spot(uuid, double precision, double precision) TO authenticated;

-- Only Google's spots are forgotten when a refresh keeps failing; a phone pin stays until moved.
CREATE OR REPLACE FUNCTION public.expire_shop_locations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses SET lat = NULL, lng = NULL
   WHERE lat IS NOT NULL AND place_id IS NOT NULL AND (located_at IS NULL OR located_at < now() - interval '30 days');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_shop_locations() FROM PUBLIC, anon, authenticated;

COMMIT;
