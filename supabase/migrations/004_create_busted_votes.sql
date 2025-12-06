-- Migration: Create busted_votes table
-- Description: Stores all player votes for BUSTED!

CREATE TABLE busted_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES busted_questions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  voter_id UUID NOT NULL,
  voted_for_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, question_id, round, voter_id)
);

-- Indexes for performance
CREATE INDEX idx_busted_votes_room_id ON busted_votes(room_id);
CREATE INDEX idx_busted_votes_question_id ON busted_votes(question_id);
CREATE INDEX idx_busted_votes_round ON busted_votes(room_id, round);
CREATE INDEX idx_busted_votes_voter_id ON busted_votes(voter_id);
CREATE INDEX idx_busted_votes_voted_for_id ON busted_votes(voted_for_id);

-- Check Constraints
ALTER TABLE busted_votes ADD CONSTRAINT busted_check_round_positive
  CHECK (round > 0);

-- Note: Self-voting IS allowed in BUSTED! (no constraint)

-- Comment for documentation
COMMENT ON TABLE busted_votes IS 'BUSTED! - Stores all votes cast in games';
COMMENT ON COLUMN busted_votes.room_id IS 'Foreign key to busted_rooms table';
COMMENT ON COLUMN busted_votes.question_id IS 'Foreign key to busted_questions table';
COMMENT ON COLUMN busted_votes.round IS 'Round number for this vote';
COMMENT ON COLUMN busted_votes.voter_id IS 'UUID of the player casting the vote';
COMMENT ON COLUMN busted_votes.voted_for_id IS 'UUID of the player being voted for';
