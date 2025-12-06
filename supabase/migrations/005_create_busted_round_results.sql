-- Migration: Create busted_round_results table
-- Description: Stores aggregated results per round for faster queries in BUSTED!

CREATE TABLE busted_round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  question_id UUID NOT NULL REFERENCES busted_questions(id),
  winner_id UUID NOT NULL,
  winner_name VARCHAR(50) NOT NULL,
  total_votes INTEGER NOT NULL,
  results_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, round)
);

-- Indexes for performance
CREATE INDEX idx_busted_round_results_room_id ON busted_round_results(room_id);
CREATE INDEX idx_busted_round_results_round ON busted_round_results(room_id, round);
CREATE INDEX idx_busted_round_results_winner_id ON busted_round_results(winner_id);

-- Check Constraints
ALTER TABLE busted_round_results ADD CONSTRAINT busted_check_total_votes_positive
  CHECK (total_votes > 0);

-- Comment for documentation
COMMENT ON TABLE busted_round_results IS 'BUSTED! - Stores aggregated round results for performance';
COMMENT ON COLUMN busted_round_results.room_id IS 'Foreign key to busted_rooms table';
COMMENT ON COLUMN busted_round_results.round IS 'Round number';
COMMENT ON COLUMN busted_round_results.question_id IS 'Foreign key to busted_questions table';
COMMENT ON COLUMN busted_round_results.winner_id IS 'UUID of the player who won this round';
COMMENT ON COLUMN busted_round_results.winner_name IS 'Denormalized winner name for performance';
COMMENT ON COLUMN busted_round_results.total_votes IS 'Total number of votes cast in this round';
COMMENT ON COLUMN busted_round_results.results_json IS 'Full results as JSON array with vote counts per player';
