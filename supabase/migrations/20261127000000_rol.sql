-- Rolul utilizatorului: cadru didactic („cadru”) sau părinte („parinte”). Decide doar ce meniu și
-- ce panou vede; nu dă și nu ia acces la nimic. Fără rol ales, coloana rămâne NULL.
-- Rulează după 20261124000000_planse.sql. Poate fi rulat de mai multe ori.

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS role TEXT;

ALTER TABLE users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE users_profile ADD CONSTRAINT users_profile_role_check CHECK (role IS NULL OR role IN ('cadru', 'parinte'));

-- Utilizatorul își poate schimba singur rolul, pe lângă câmpurile permise deja
-- (20261023000000_securizare_acces.sql). Nivelul (tier) și codul rămân doar pe server.
-- Politica RLS „Users can update own profile” (auth.uid() = id) limitează schimbarea la propriul rând.
GRANT UPDATE (display_name, children, preferences, updated_at, role) ON users_profile TO authenticated;
