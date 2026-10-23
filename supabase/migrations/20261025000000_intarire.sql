-- Întăriri după revizia de securitate. Rulează după celelalte două migrări. Poate fi rulat de mai multe ori.

-- 1. La inserare, utilizatorul nu își poate da singur contoare, note sau „recomandat”.
REVOKE INSERT ON saved_worksheets FROM anon, authenticated;
GRANT INSERT (user_id, name, configuration) ON saved_worksheets TO authenticated;

REVOKE INSERT, UPDATE ON community_templates FROM anon, authenticated;
GRANT INSERT (creator_id, name, description, configuration, category, tags) ON community_templates TO authenticated;
GRANT UPDATE (name, description, configuration, category, tags) ON community_templates TO authenticated;

-- 2. Încercări de cod limitate: cel mult 10 coduri greșite pe oră per cont.
CREATE TABLE IF NOT EXISTS access_code_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS access_code_attempts_user_time ON access_code_attempts (user_id, attempted_at);
ALTER TABLE access_code_attempts ENABLE ROW LEVEL SECURITY; -- fără politici: invizibil din browser

-- 3. Răscumpărarea întoarce un rezultat în loc să arunce eroare, ca încercarea greșită să rămână
--    înregistrată. Un cod mai mic nu înlocuiește un cod mai mare deja folosit.
DROP FUNCTION IF EXISTS redeem_access_code(TEXT);
CREATE FUNCTION redeem_access_code(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT := upper(trim(p_code));
  v_tier TEXT;
  v_old_tier TEXT;
  v_rank JSONB := '{"free":0,"starter":1,"full":2}';
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'not_authenticated';
  END IF;

  IF (SELECT count(*) FROM access_code_attempts
       WHERE user_id = v_uid AND attempted_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RETURN 'too_many_attempts';
  END IF;

  UPDATE access_codes
     SET is_used = true, used_by = v_uid, used_at = NOW()
   WHERE code = v_code AND is_used = false
  RETURNING tier INTO v_tier;

  IF v_tier IS NULL THEN
    INSERT INTO access_code_attempts (user_id) VALUES (v_uid);
    RETURN 'invalid_code';
  END IF;

  SELECT c.tier INTO v_old_tier
    FROM users_profile p JOIN access_codes c ON c.code = p.access_code
   WHERE p.id = v_uid;

  UPDATE users_profile
     SET tier = CASE WHEN (v_rank ->> tier)::INT >= (v_rank ->> v_tier)::INT THEN tier ELSE v_tier END,
         access_code = CASE WHEN v_old_tier IS NULL OR (v_rank ->> v_tier)::INT >= (v_rank ->> v_old_tier)::INT
                            THEN v_code ELSE access_code END,
         updated_at = NOW()
   WHERE id = v_uid;

  RETURN v_tier;
END;
$$;

REVOKE ALL ON FUNCTION redeem_access_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_access_code(TEXT) TO authenticated;

-- 4. Coduri noi mai lungi (48 de biți): WIZ-XXXX-XXXX-XXXX. Codurile vechi rămân valabile.
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
    v_code := 'WIZ-' || substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4) || '-' || substr(v_hex, 9, 4);
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
