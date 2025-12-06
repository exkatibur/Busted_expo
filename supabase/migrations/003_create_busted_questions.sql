-- Migration: Create busted_questions table
-- Description: Stores all game questions for BUSTED!

CREATE TABLE busted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_busted_questions_vibe ON busted_questions(vibe);
CREATE INDEX idx_busted_questions_is_premium ON busted_questions(is_premium);

-- Check Constraints
ALTER TABLE busted_questions ADD CONSTRAINT busted_check_question_vibe
  CHECK (vibe IN ('party', 'date_night', 'family', 'spicy'));

ALTER TABLE busted_questions ADD CONSTRAINT busted_check_question_text_length
  CHECK (LENGTH(text) >= 10 AND LENGTH(text) <= 500);

-- Comment for documentation
COMMENT ON TABLE busted_questions IS 'BUSTED! - Stores all game questions organized by vibe';
COMMENT ON COLUMN busted_questions.vibe IS 'Question vibe category (party, date_night, family, spicy)';
COMMENT ON COLUMN busted_questions.text IS 'The question text (e.g., "Wer würde am ehesten...")';
COMMENT ON COLUMN busted_questions.is_premium IS 'True if this is a premium-only question';
