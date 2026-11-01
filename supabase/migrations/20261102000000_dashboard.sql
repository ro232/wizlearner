-- Contul ca tablou de bord: proiecte de toate felurile, dosare, istoricul descărcărilor, copiii.
-- Rulează după 20261027000000_facturi.sql. Poate fi rulat de mai multe ori.

-- 1. Proiecte salvate de orice fel, nu doar fișe din generator.
--    sheet = fișă din generator, workbook = caiet gata făcut, book = caiet KDP,
--    name-book = caietul cu numele, group = fișele pentru grupă (cu lista de nume).
ALTER TABLE saved_worksheets ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sheet';
ALTER TABLE saved_worksheets ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE saved_worksheets DROP CONSTRAINT IF EXISTS saved_worksheets_kind_check;
ALTER TABLE saved_worksheets ADD CONSTRAINT saved_worksheets_kind_check CHECK (kind IN ('sheet', 'workbook', 'book', 'name-book', 'group'));
ALTER TABLE saved_worksheets DROP CONSTRAINT IF EXISTS saved_worksheets_folder_len;
ALTER TABLE saved_worksheets ADD CONSTRAINT saved_worksheets_folder_len CHECK (folder IS NULL OR char_length(folder) <= 60);
CREATE INDEX IF NOT EXISTS saved_worksheets_user_updated ON saved_worksheets (user_id, updated_at DESC);

REVOKE INSERT ON saved_worksheets FROM anon, authenticated;
GRANT INSERT (user_id, name, configuration, kind, folder) ON saved_worksheets TO authenticated;
REVOKE UPDATE ON saved_worksheets FROM anon, authenticated;
GRANT UPDATE (name, configuration, folder, updated_at) ON saved_worksheets TO authenticated;

-- 2. Istoricul descărcărilor: ce a descărcat fiecare, ca să refacă ușor o fișă.
--    Se păstrează ultimele 60 pe cont (cele vechi se șterg singure).
CREATE TABLE IF NOT EXISTS download_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sheet', 'workbook', 'book', 'name-book', 'group')),
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  configuration JSONB NOT NULL,
  pages INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS download_history_user_time ON download_history (user_id, created_at DESC);
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own history: read" ON download_history;
CREATE POLICY "Own history: read" ON download_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own history: add" ON download_history;
CREATE POLICY "Own history: add" ON download_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own history: delete" ON download_history;
CREATE POLICY "Own history: delete" ON download_history FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON download_history FROM anon, authenticated;
REVOKE INSERT ON download_history FROM anon;
GRANT INSERT (user_id, kind, title, configuration, pages) ON download_history TO authenticated;

CREATE OR REPLACE FUNCTION trim_download_history() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM download_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (SELECT id FROM download_history WHERE user_id = NEW.user_id ORDER BY created_at DESC LIMIT 60);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS download_history_trim ON download_history;
CREATE TRIGGER download_history_trim AFTER INSERT ON download_history FOR EACH ROW EXECUTE FUNCTION trim_download_history();

-- 3. Copiii: doar prenumele și cum lucrează (nivel, litere). Nimic altceva despre ei.
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  script TEXT NOT NULL DEFAULT 'print' CHECK (script IN ('print', 'cursive')),
  letter_mode TEXT NOT NULL DEFAULT 'uppercase' CHECK (letter_mode IN ('uppercase', 'lowercase', 'paired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS child_profiles_user ON child_profiles (user_id);
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own children" ON child_profiles;
CREATE POLICY "Own children" ON child_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON child_profiles FROM anon;
