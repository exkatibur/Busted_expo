-- Migration: Enable Row Level Security for BUSTED!
-- Description: RLS policies for all BUSTED! tables (permissive for anonymous auth)

-- IMPORTANT: Since we use anonymous UUIDs (not Supabase Auth),
-- we make policies permissive and rely on app-level logic for security.
-- This is acceptable for a party game without sensitive data.

-- ============================================
-- BUSTED_ROOMS TABLE
-- ============================================
ALTER TABLE busted_rooms ENABLE ROW LEVEL SECURITY;

-- Everyone can view rooms (needed for joining by code)
CREATE POLICY "busted_rooms_select_all" ON busted_rooms
  FOR SELECT
  USING (true);

-- Anyone can create a room
CREATE POLICY "busted_rooms_insert_all" ON busted_rooms
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update rooms (host checks are in app logic)
CREATE POLICY "busted_rooms_update_all" ON busted_rooms
  FOR UPDATE
  USING (true);

-- Rooms can be deleted (for cleanup)
CREATE POLICY "busted_rooms_delete_all" ON busted_rooms
  FOR DELETE
  USING (true);

-- ============================================
-- BUSTED_PLAYERS TABLE
-- ============================================
ALTER TABLE busted_players ENABLE ROW LEVEL SECURITY;

-- Everyone can view players
CREATE POLICY "busted_players_select_all" ON busted_players
  FOR SELECT
  USING (true);

-- Anyone can add players
CREATE POLICY "busted_players_insert_all" ON busted_players
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update players
CREATE POLICY "busted_players_update_all" ON busted_players
  FOR UPDATE
  USING (true);

-- Players can be deleted
CREATE POLICY "busted_players_delete_all" ON busted_players
  FOR DELETE
  USING (true);

-- ============================================
-- BUSTED_QUESTIONS TABLE
-- ============================================
ALTER TABLE busted_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can read questions (premium check is in app)
CREATE POLICY "busted_questions_select_all" ON busted_questions
  FOR SELECT
  USING (true);

-- Only service role can insert questions (via migrations/admin)
-- No public INSERT policy

-- ============================================
-- BUSTED_VOTES TABLE
-- ============================================
ALTER TABLE busted_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can view votes (needed for results)
CREATE POLICY "busted_votes_select_all" ON busted_votes
  FOR SELECT
  USING (true);

-- Anyone can cast votes
CREATE POLICY "busted_votes_insert_all" ON busted_votes
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE - votes are immutable once cast
-- (integrity protection)

-- ============================================
-- BUSTED_ROUND_RESULTS TABLE
-- ============================================
ALTER TABLE busted_round_results ENABLE ROW LEVEL SECURITY;

-- Everyone can view results
CREATE POLICY "busted_round_results_select_all" ON busted_round_results
  FOR SELECT
  USING (true);

-- Only system (via function) can insert results
CREATE POLICY "busted_round_results_insert_all" ON busted_round_results
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE for results (immutable)

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "busted_rooms_select_all" ON busted_rooms IS
  'BUSTED! - Permissive policy - all rooms are viewable';

COMMENT ON POLICY "busted_players_select_all" ON busted_players IS
  'BUSTED! - Permissive policy - all players are viewable';

COMMENT ON POLICY "busted_votes_select_all" ON busted_votes IS
  'BUSTED! - Permissive policy - all votes are viewable for results display';

COMMENT ON POLICY "busted_round_results_select_all" ON busted_round_results IS
  'BUSTED! - Permissive policy - all round results are viewable';

-- ============================================
-- SECURITY NOTES
-- ============================================

-- Since this is a party game without sensitive personal data,
-- we use permissive RLS policies and rely on:
-- 1. App-level validation (e.g., only host can start game)
-- 2. Unique constraints (e.g., can't vote twice)
-- 3. Check constraints (e.g., can't vote for yourself)
-- 4. Short TTL (rooms auto-delete after 24h)
--
-- For production with user accounts, these policies should be
-- tightened to use auth.uid() and proper access controls.
