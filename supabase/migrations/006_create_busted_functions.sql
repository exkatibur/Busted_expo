-- Migration: Create BUSTED! database functions
-- Description: Utility functions for game logic

-- Function: Generate unique room code
CREATE OR REPLACE FUNCTION busted_generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Generate random 6-character code (uppercase letters and numbers)
    new_code := UPPER(
      SUBSTR(
        REPLACE(
          ENCODE(gen_random_bytes(4), 'hex'),
          'e', '2'
        ),
        1, 6
      )
    );

    -- Ensure code only contains alphanumeric characters
    new_code := REGEXP_REPLACE(new_code, '[^A-Z0-9]', '0', 'g');

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM busted_rooms
      WHERE code = new_code
      AND status != 'finished'
    ) INTO code_exists;

    attempts := attempts + 1;

    -- Exit if code is unique or max attempts reached
    EXIT WHEN NOT code_exists OR attempts >= max_attempts;
  END LOOP;

  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Unable to generate unique room code after % attempts', max_attempts;
  END IF;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION busted_generate_room_code() IS 'BUSTED! - Generates a unique 6-character room code';

-- Function: Calculate round results
CREATE OR REPLACE FUNCTION busted_calculate_round_results(
  p_room_id UUID,
  p_round INTEGER,
  p_question_id UUID
)
RETURNS void AS $$
DECLARE
  v_results JSONB;
  v_winner_id UUID;
  v_winner_name VARCHAR(50);
  v_total_votes INTEGER;
BEGIN
  -- First get total votes count
  SELECT COUNT(*) INTO v_total_votes
  FROM busted_votes
  WHERE room_id = p_room_id AND round = p_round;

  -- Handle case where no votes were cast
  IF v_total_votes IS NULL OR v_total_votes = 0 THEN
    RAISE EXCEPTION 'No votes found for room % round %', p_room_id, p_round;
  END IF;

  -- Calculate vote counts and build results
  WITH vote_counts AS (
    SELECT
      v.voted_for_id,
      p.username,
      COUNT(*) as vote_count
    FROM busted_votes v
    JOIN busted_players p ON p.user_id = v.voted_for_id AND p.room_id = v.room_id
    WHERE v.room_id = p_room_id
    AND v.round = p_round
    GROUP BY v.voted_for_id, p.username
    ORDER BY vote_count DESC
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'playerId', vc.voted_for_id,
        'playerName', vc.username,
        'votes', vc.vote_count,
        'percentage', ROUND((vc.vote_count::NUMERIC / v_total_votes::NUMERIC) * 100)
      )
    )
  INTO v_results
  FROM vote_counts vc;

  -- Get winner (player with most votes)
  SELECT voted_for_id, username
  INTO v_winner_id, v_winner_name
  FROM (
    SELECT
      v.voted_for_id,
      p.username,
      COUNT(*) as vote_count
    FROM busted_votes v
    JOIN busted_players p ON p.user_id = v.voted_for_id AND p.room_id = v.room_id
    WHERE v.room_id = p_room_id
    AND v.round = p_round
    GROUP BY v.voted_for_id, p.username
    ORDER BY vote_count DESC
    LIMIT 1
  ) winner;

  -- Insert results (or update if already exists)
  INSERT INTO busted_round_results (
    room_id,
    round,
    question_id,
    winner_id,
    winner_name,
    total_votes,
    results_json
  ) VALUES (
    p_room_id,
    p_round,
    p_question_id,
    v_winner_id,
    v_winner_name,
    v_total_votes,
    v_results
  )
  ON CONFLICT (room_id, round)
  DO UPDATE SET
    winner_id = EXCLUDED.winner_id,
    winner_name = EXCLUDED.winner_name,
    total_votes = EXCLUDED.total_votes,
    results_json = EXCLUDED.results_json;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION busted_calculate_round_results(UUID, INTEGER, UUID) IS 'BUSTED! - Calculates and stores results for a completed round';

-- Function: Cleanup old rooms (for cron job)
CREATE OR REPLACE FUNCTION busted_cleanup_old_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM busted_rooms
    WHERE created_at < NOW() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION busted_cleanup_old_rooms() IS 'BUSTED! - Deletes rooms older than 24 hours (for scheduled cron job)';

-- Function: Get random question for vibe
CREATE OR REPLACE FUNCTION busted_get_random_question(
  p_vibe VARCHAR(20),
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  vibe VARCHAR(20),
  text TEXT,
  is_premium BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.vibe, q.text, q.is_premium
  FROM busted_questions q
  WHERE q.vibe = p_vibe
  AND q.is_premium = false
  AND NOT (q.id = ANY(p_exclude_ids))
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION busted_get_random_question(VARCHAR, UUID[]) IS 'BUSTED! - Returns a random question for the given vibe, excluding specified IDs';
