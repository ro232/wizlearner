-- Etapa 1: securizarea accesului plătit.
-- Rulează acest fișier o singură dată în Supabase → SQL Editor, pe baza de date existentă.
-- Poate fi rulat de mai multe ori fără efecte nedorite.

-- 1. Codurile de acces nu mai pot fi citite din browser.
--    RLS rămâne activ, iar fără nicio politică de SELECT clienții nu văd nimic.
DROP POLICY IF EXISTS "Anyone can view available codes" ON access_codes;

-- 2. Utilizatorii nu își mai pot modifica singuri nivelul (tier) sau codul.
--    Profilul e creat de trigger-ul de înregistrare, nu din browser.
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;
REVOKE INSERT, UPDATE ON users_profile FROM anon, authenticated;
GRANT UPDATE (display_name, children, preferences, updated_at) ON users_profile TO authenticated;

-- 3. Răscumpărarea unui cod se face pe server, atomic: codul e marcat folosit
--    și nivelul e acordat în aceeași operație, iar un cod nu poate fi folosit de două ori.
CREATE OR REPLACE FUNCTION redeem_access_code(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT := upper(trim(p_code));
  v_tier TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE access_codes
     SET is_used = true, used_by = v_uid, used_at = NOW()
   WHERE code = v_code AND is_used = false
  RETURNING tier INTO v_tier;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Un cod Starter nu retrogradează un cont care are deja acces complet.
  UPDATE users_profile
     SET tier = CASE WHEN tier = 'full' THEN 'full' ELSE v_tier END,
         access_code = v_code,
         updated_at = NOW()
   WHERE id = v_uid;

  RETURN v_tier;
END;
$$;

REVOKE ALL ON FUNCTION redeem_access_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_access_code(TEXT) TO authenticated;

-- 4. Generarea codurilor (de exemplu pentru cumpărătorii de pe Etsy).
--    Se apelează doar din SQL Editor, nu din aplicație:
--      SELECT * FROM generate_access_codes('starter', 10);
CREATE OR REPLACE FUNCTION generate_access_codes(p_tier TEXT, p_count INT)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_hex TEXT;
  i INT := 0;
BEGIN
  IF p_tier NOT IN ('starter', 'full') THEN
    RAISE EXCEPTION 'tier invalid: %', p_tier;
  END IF;
  WHILE i < p_count LOOP
    v_hex := upper(replace(gen_random_uuid()::text, '-', ''));
    v_code := 'WIZ-' || substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4);
    INSERT INTO access_codes (code, tier) VALUES (v_code, p_tier)
    ON CONFLICT (code) DO NOTHING;
    IF FOUND THEN
      i := i + 1;
      RETURN NEXT v_code;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION generate_access_codes(TEXT, INT) FROM PUBLIC, anon, authenticated;

-- 5. Trigger-ul de creare a profilului rulează cu drepturi ridicate: fixăm search_path.
ALTER FUNCTION handle_new_user() SET search_path = public;
