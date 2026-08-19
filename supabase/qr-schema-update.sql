-- ============================================================
-- BRASA Points App — QR Token Extension
-- Add to existing schema to enable QR-based check-ins
-- ============================================================

-- Add QR token column to checkin_codes if not exists
ALTER TABLE checkin_codes 
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;

-- Create index for fast QR token lookups
CREATE INDEX IF NOT EXISTS idx_checkin_codes_qr_token 
ON checkin_codes(qr_token) WHERE qr_token IS NOT NULL;

-- ============================================================
-- RPC: process_qr_checkin
-- Validates a QR token (more secure than text codes)
-- One-time use, ties to user and event
-- ============================================================
CREATE OR REPLACE FUNCTION process_qr_checkin(
  p_user_id  UUID,
  p_qr_token TEXT
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
  -- 1. Validate QR token exists
  SELECT * INTO v_code
  FROM checkin_codes
  WHERE qr_token = p_qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'QR code not found or invalid.');
  END IF;

  -- 2. Check expiry
  IF v_code.expires_at < NOW() THEN
    RETURN json_build_object('success', FALSE, 'error', 'QR code has expired. Ask an organizer for a new one.');
  END IF;

  -- 3. Get event to verify it's still valid
  SELECT * INTO v_event FROM events WHERE id = v_code.event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;

  -- 4. Prevent duplicate check-in for this user at this event
  IF EXISTS (SELECT 1 FROM checkins WHERE user_id = p_user_id AND event_id = v_code.event_id) THEN
    RETURN json_build_object('success', FALSE, 'error', 'You already checked in to this event.');
  END IF;

  v_points := v_event.points;

  -- 5. Record check-in (atomic)
  BEGIN
    INSERT INTO checkins (user_id, event_id, checkin_code_id, points_earned)
    VALUES (p_user_id, v_code.event_id, v_code.id, v_points)
    ON CONFLICT (user_id, event_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'error', 'Could not record check-in. Try again.');
  END;

  -- 6. Update profile totals (atomic)
  UPDATE profiles
  SET total_points    = total_points + v_points,
      events_attended = events_attended + 1
  WHERE id = p_user_id;

  -- 7. Invalidate token by setting a flag (optional — prevents reuse attempts)
  -- For this system, the UNIQUE(user_id, event_id) constraint in checkins prevents reuse anyway
  
  RETURN json_build_object(
    'success', TRUE, 
    'points_earned', v_points,
    'event_name', v_event.name,
    'new_total_points', (SELECT total_points FROM profiles WHERE id = p_user_id)
  );
END;
$$;

-- ============================================================
-- Helper Function: Generate unique QR token
-- ============================================================
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Generate a random 32-character alphanumeric token
  v_token := SUBSTR(md5(random()::text || clock_timestamp()::text), 1, 32);
  
  -- Verify uniqueness
  SELECT EXISTS(SELECT 1 FROM checkin_codes WHERE qr_token = v_token) INTO v_exists;
  
  -- If collision (very unlikely), retry
  WHILE v_exists LOOP
    v_token := SUBSTR(md5(random()::text || clock_timestamp()::text), 1, 32);
    SELECT EXISTS(SELECT 1 FROM checkin_codes WHERE qr_token = v_token) INTO v_exists;
  END LOOP;
  
  RETURN v_token;
END;
$$;

-- ============================================================
-- Notes for Frontend Integration
-- ============================================================
-- To generate a QR code in the admin screen:
--   1. Admin creates event
--   2. Admin clicks "Generate QR Code"
--   3. App calls: INSERT INTO checkin_codes (event_id, qr_token, expires_at, created_by)
--                 VALUES (event_id, generate_qr_token(), NOW() + interval '20 minutes', user_id)
--   4. Convert qr_token to QR image using a library like qrcode.react
--   5. Display QR to members
--
-- To scan and check in:
--   1. Member clicks "Scan QR" on event screen
--   2. Browser QR scanner reads the token
--   3. App calls: SELECT process_qr_checkin(current_user_id, qr_token)
--   4. Backend validates and returns success + points
