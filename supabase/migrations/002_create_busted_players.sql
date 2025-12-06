-- Migration: Create busted_players table
-- Description: Stores all players in BUSTED! rooms

CREATE TABLE busted_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_busted_players_room_id ON busted_players(room_id);
CREATE INDEX idx_busted_players_user_id ON busted_players(user_id);
CREATE INDEX idx_busted_players_is_active ON busted_players(is_active);

-- Check Constraints
ALTER TABLE busted_players ADD CONSTRAINT busted_check_username_length
  CHECK (LENGTH(username) >= 2 AND LENGTH(username) <= 50);

-- Comment for documentation
COMMENT ON TABLE busted_players IS 'BUSTED! - Stores all players who have joined rooms';
COMMENT ON COLUMN busted_players.room_id IS 'Foreign key to busted_rooms table (CASCADE on delete)';
COMMENT ON COLUMN busted_players.user_id IS 'UUID from AsyncStorage (anonymous user ID)';
COMMENT ON COLUMN busted_players.username IS 'Player-chosen username (2-50 characters)';
COMMENT ON COLUMN busted_players.is_host IS 'True if this player created the room';
COMMENT ON COLUMN busted_players.is_active IS 'False if player has left the room';
COMMENT ON COLUMN busted_players.joined_at IS 'Timestamp when player joined the room';
