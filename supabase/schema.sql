-- ============================================================
-- BRASA Points App — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'Member',
  total_points    INTEGER NOT NULL DEFAULT 0,
  events_attended INTEGER NOT NULL DEFAULT 0,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  date        DATE NOT NULL,
  time        TEXT,
  location    TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHECKIN CODES  (20-minute expiring codes created by admins)
CREATE TABLE IF NOT EXISTS checkin_codes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, code)
);

-- CHECKINS  (one per user per event)
CREATE TABLE IF NOT EXISTS checkins (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  checkin_code_id UUID REFERENCES checkin_codes(id),
  points_earned   INTEGER NOT NULL,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins     ENABLE ROW LEVEL SECURITY;

-- profiles: any authenticated user can read; only own row to insert/update
CREATE POLICY "profiles_select"  ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_insert"  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- events: any authenticated user can read; only admins can insert/update/delete
CREATE POLICY "events_select"  ON events FOR SELECT  TO authenticated USING (TRUE);
CREATE POLICY "events_insert"  ON events FOR INSERT  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "events_update"  ON events FOR UPDATE  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "events_delete"  ON events FOR DELETE  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- checkin_codes: authenticated users can read (needed to display countdown); admins insert
CREATE POLICY "codes_select" ON checkin_codes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "codes_insert" ON checkin_codes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- checkins: any authenticated user can read (leaderboard); insert own row only
CREATE POLICY "checkins_select" ON checkins FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "checkins_insert" ON checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: process_checkin  (atomic, runs as SECURITY DEFINER)
-- Validates code expiry, prevents duplicates, awards points.
-- ============================================================
CREATE OR REPLACE FUNCTION process_checkin(
  p_user_id  UUID,
  p_event_id UUID,
  p_code     TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   checkin_codes%ROWTYPE;
  v_event  events%ROWTYPE;
  v_points INTEGER;
BEGIN
  -- 1. Validate code exists for this event
  SELECT * INTO v_code
  FROM checkin_codes
  WHERE code = p_code AND event_id = p_event_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Código inválido para este evento.');
  END IF;

  -- 2. Check expiry
  IF v_code.expires_at < NOW() THEN
    RETURN json_build_object('success', FALSE, 'error', 'O código expirou. Peça um novo ao organizador.');
  END IF;

  -- 3. Prevent duplicate check-in
  IF EXISTS (SELECT 1 FROM checkins WHERE user_id = p_user_id AND event_id = p_event_id) THEN
    RETURN json_build_object('success', FALSE, 'error', 'Você já fez check-in neste evento.');
  END IF;

  -- 4. Get event points
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  v_points := v_event.points;

  -- 5. Record check-in
  INSERT INTO checkins (user_id, event_id, checkin_code_id, points_earned)
  VALUES (p_user_id, p_event_id, v_code.id, v_points);

  -- 6. Update profile totals
  UPDATE profiles
  SET total_points    = total_points + v_points,
      events_attended = events_attended + 1
  WHERE id = p_user_id;

  RETURN json_build_object('success', TRUE, 'points_earned', v_points);
END;
$$;

-- ============================================================
-- SAMPLE DATA (optional — remove before production)
-- ============================================================
-- INSERT INTO events (name, date, time, location, points) VALUES
--   ('Game Night',        '2026-05-02', '7:00 PM',  'Student Union',          50),
--   ('Soccer Tournament', '2026-05-10', '10:00 AM', 'UCF Soccer Fields',       75),
--   ('BRASA Churrasco',   '2026-05-17', '12:00 PM', 'Lake Claire',            100),
--   ('PD Speaker Series', '2026-06-05', '6:00 PM',  'Business Building',       60),
--   ('BRASA Connect',     '2026-07-12', '5:00 PM',  'Orlando Downtown',        150);
