-- WorksheetWiz Database Schema for Supabase

-- Users profile (extends auth.users)
CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'full')),
  access_code TEXT,
  children JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved worksheets
CREATE TABLE saved_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  configuration JSONB NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  rating_avg DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access codes
CREATE TABLE access_codes (
  code TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'full')),
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES users_profile(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children progress tracking
CREATE TABLE children_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  letter TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uppercase', 'lowercase', 'number', 'shape', 'pre-write')),
  times_practiced INTEGER DEFAULT 0,
  current_difficulty TEXT DEFAULT 'beginner' CHECK (current_difficulty IN ('beginner', 'intermediate', 'advanced')),
  last_practiced TIMESTAMPTZ DEFAULT NOW()
);

-- Community templates
CREATE TABLE community_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  downloads_count INTEGER DEFAULT 0,
  rating_avg DECIMAL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template ratings
CREATE TABLE template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES community_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, user_id)
);

-- RLS Policies
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users_profile FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users_profile FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users_profile FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can manage their own worksheets
CREATE POLICY "Users can view own worksheets" ON saved_worksheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own worksheets" ON saved_worksheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own worksheets" ON saved_worksheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own worksheets" ON saved_worksheets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public worksheets are viewable" ON saved_worksheets FOR SELECT USING (is_public = true);

-- Access codes: anyone can check, only server can modify
CREATE POLICY "Anyone can view available codes" ON access_codes FOR SELECT USING (true);

-- Progress: users manage their own
CREATE POLICY "Users can manage own progress" ON children_progress FOR ALL USING (auth.uid() = user_id);

-- Community templates: public read, own write
CREATE POLICY "Anyone can view templates" ON community_templates FOR SELECT USING (true);
CREATE POLICY "Users can create templates" ON community_templates FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own templates" ON community_templates FOR UPDATE USING (auth.uid() = creator_id);

-- Ratings: public read, own write
CREATE POLICY "Anyone can view ratings" ON template_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate" ON template_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_profile (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
