-- Migration: Create busted_rooms table
-- Description: Stores all game rooms for BUSTED! app

CREATE TABLE busted_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  vibe VARCHAR(20) NOT NULL DEFAULT 'party',
  status VARCHAR(20) NOT NULL DEFAULT 'lobby',
  current_question_id UUID,
  current_round INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_busted_rooms_code ON busted_rooms(code);
CREATE INDEX idx_busted_rooms_status ON busted_rooms(status);
CREATE INDEX idx_busted_rooms_created_at ON busted_rooms(created_at);

-- Check Constraints
ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_vibe
  CHECK (vibe IN ('party', 'date_night', 'family', 'spicy'));

ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_status
  CHECK (status IN ('lobby', 'playing', 'results', 'finished'));

ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_code_format
  CHECK (code ~ '^[A-Z0-9]{6}$');

-- Comment for documentation
COMMENT ON TABLE busted_rooms IS 'BUSTED! - Stores all game rooms with their current state and configuration';
COMMENT ON COLUMN busted_rooms.code IS '6-character unique room code for joining';
COMMENT ON COLUMN busted_rooms.host_id IS 'UUID of the player who created the room';
COMMENT ON COLUMN busted_rooms.vibe IS 'Selected game vibe (party, date_night, family, spicy)';
COMMENT ON COLUMN busted_rooms.status IS 'Current room status (lobby, playing, results, finished)';
COMMENT ON COLUMN busted_rooms.current_question_id IS 'Currently active question (if playing)';
COMMENT ON COLUMN busted_rooms.current_round IS 'Current round number (starts at 1)';
